/**
 * Whether the hero can cast a skill right now, and why not — the client-side
 * half of `CNewUISkillList::RenderSkillIcon`'s `bCantSkill` (the greyed
 * icon) plus the moment-to-moment gates the cast system checks before it
 * sends (`CheckSkillUseCondition`, mana / AG, `CheckSkillDelay`).
 *
 * Two readers, on purpose: `skillRequirementsMet` is the *static* rule —
 * class, level, energy, the weapon a weapon-skill hangs off — and is what
 * greys the icon; `canUseSkill` adds the *transient* gates (mana, AG, the
 * running delay) and is what the cast system and the tooltip ask.
 *
 * Driven by `Store.playerData` (stats, hands, skills) and `cooldowns.ts`
 * (listed before this entry). Pure readers over MobX state: no clock, so no
 * `update`; nothing held, so no `reset`.
 */
import { CharacterClassNumber } from '../common/types';
import { ItemsDatabase } from '../common/itemsDatabase';
import { skillDefinition, type SkillDefinition } from '../common/skillsDatabase';
import type { Item } from '../ecs/world';
import type { SkillLayer } from './layer';
import { skillCooldownRemaining } from './cooldowns';
import { Store } from '../store';

// ---- 1. tuning -------------------------------------------------------------

// Every threshold is a skill's own row in skillsDatabase.

/**
 * Item groups 0..5 are the weapons (ITEM_SWORD … ITEM_STAFF). Orbs (12) also
 * fill the `Skill` column, but that is the skill they *teach*, not grant.
 */
const LAST_WEAPON_GROUP = 5;

/**
 * OpenMU's `CharacterClasses` flag names as they appear in `classes` of
 * skillsDatabase.ts, spelled out as the wire class numbers each covers.
 * A skill's expression is `A | B`; the hero needs one of them.
 */
const C = CharacterClassNumber;
const MAGICIANS = [C.DarkWizard, C.SoulMaster, C.GrandMaster];
const KNIGHTS = [C.DarkKnight, C.BladeKnight, C.BladeMaster];
const ELFS = [C.FairyElf, C.MuseElf, C.HighElf];
const MGS = [C.MagicGladiator, C.DuelMaster];
const LORDS = [C.DarkLord, C.LordEmperor];
const SUMMONERS = [C.Summoner, C.BloodySummoner, C.DimensionMaster];
const FIGHTERS = [C.RageFighter, C.FistMaster];
const MASTERS = [
  C.GrandMaster, C.BladeMaster, C.HighElf, C.DuelMaster, C.LordEmperor,
  C.DimensionMaster, C.FistMaster,
];
const SECOND_CLASS = [
  C.SoulMaster, C.BladeKnight, C.MuseElf, C.MagicGladiator, C.DarkLord,
  C.BloodySummoner, C.RageFighter,
];

const CLASS_FLAGS: Record<string, readonly CharacterClassNumber[]> = {
  None: [],
  All: [...MAGICIANS, ...KNIGHTS, ...ELFS, ...MGS, ...LORDS, ...SUMMONERS, ...FIGHTERS],
  AllMagicians: MAGICIANS,
  AllSummoners: SUMMONERS,
  AllKnights: KNIGHTS,
  AllMGs: MGS,
  AllLords: LORDS,
  AllElfs: ELFS,
  AllFighters: FIGHTERS,
  AllKnightsLordsAndMGs: [...KNIGHTS, ...LORDS, ...MGS],
  SoulMasterAndGrandMaster: [C.SoulMaster, C.GrandMaster],
  BladeKnightAndBladeMaster: [C.BladeKnight, C.BladeMaster],
  MuseElfAndHighElf: [C.MuseElf, C.HighElf],
  AllMasters: MASTERS,
  AllMastersAndSecondClass: [...MASTERS, ...SECOND_CLASS],
  AllMastersExceptFistMaster: MASTERS.filter(c => c !== C.FistMaster),
  GrandMaster: [C.GrandMaster],
  BladeMaster: [C.BladeMaster],
  HighElf: [C.HighElf],
  DuelMaster: [C.DuelMaster],
  LordEmperor: [C.LordEmperor],
  DimensionMaster: [C.DimensionMaster],
  FistMaster: [C.FistMaster],
};

// ---- 2. state + readers ----------------------------------------------------

/** Why a skill is not castable, in the order the tooltip lists them. */
export type SkillBlock =
  | 'unknown'
  | 'class'
  | 'level'
  | 'energy'
  | 'weapon'
  | 'mana'
  | 'ag'
  | 'cooldown';

export interface SkillUsability {
  /** Everything passes: the cast system may send. */
  usable: boolean;
  /** `bCantSkill`: the static rules pass, so the icon is drawn in colour. */
  requirementsMet: boolean;
  blocks: SkillBlock[];
}

/**
 * Skill number → weapon kinds (group/index) whose `Skill` column grants it.
 * Built once from Item.txt: swords carry the Knight cuts (19..23), bows
 * Triple Shot (24), Dark Reign blades Power Slash (56), scepters Force Wave
 * (66), the Summoner books their curses (223..225).
 */
let weaponSkills: Set<number> | null = null;

function weaponSkillNumbers(): Set<number> {
  if (weaponSkills) return weaponSkills;
  weaponSkills = new Set();
  for (const byIndex of Object.values(ItemsDatabase.cache)) {
    for (const item of Object.values(byIndex)) {
      if (item.Skill > 0 && item.Group <= LAST_WEAPON_GROUP) {
        weaponSkills.add(item.Skill);
      }
    }
  }
  return weaponSkills;
}

/** Whether a skill only exists while the weapon that carries it is held. */
export function isWeaponSkill(num: number): boolean {
  return weaponSkillNumbers().has(num);
}

function handGrants(item: Item | null, num: number): boolean {
  if (!item || !item.hasSkill) return false;
  return ItemsDatabase.getItem(item.group, item.num)?.Skill === num;
}

/** The classes a skill's `classes` expression admits. */
export function skillClasses(def: SkillDefinition): ReadonlySet<CharacterClassNumber> {
  const out = new Set<CharacterClassNumber>();
  for (const flag of def.classes.split('|')) {
    for (const c of CLASS_FLAGS[flag.trim()] ?? []) out.add(c);
  }
  return out;
}

/**
 * The full verdict on one skill for the hero as they are right now. Reads
 * only observables, so an `observer` re-renders when any input moves.
 */
export function skillUsability(num: number): SkillUsability {
  const def = skillDefinition(num);
  if (!def) return { usable: false, requirementsMet: false, blocks: ['unknown'] };

  const pd = Store.playerData;
  const blocks: SkillBlock[] = [];

  // The server only teaches a class its own skills, so a learned skill has
  // already passed this; the rule matters for lists of skills not yet held.
  const learned = Store.skills.some(s => s.number === num);
  if (!learned && !skillClasses(def).has(pd.charClass)) blocks.push('class');
  if (def.level > 0 && pd.level < def.level) blocks.push('level');
  if (def.energy > 0 && pd.eng < def.energy) blocks.push('energy');
  if (
    isWeaponSkill(num) &&
    !handGrants(pd.leftHandSlot, num) &&
    !handGrants(pd.rightHandSlot, num)
  ) {
    blocks.push('weapon');
  }
  const requirementsMet = blocks.length === 0;

  if (def.mana > 0 && pd.currentMP < def.mana) blocks.push('mana');
  if (def.ag > 0 && pd.currentAG < def.ag) blocks.push('ag');
  if (skillCooldownRemaining(num) > 0) blocks.push('cooldown');

  return { usable: blocks.length === 0, requirementsMet, blocks };
}

/** `bCantSkill` inverted: class / level / energy / weapon all pass. */
export function skillRequirementsMet(num: number): boolean {
  return skillUsability(num).requirementsMet;
}

/** Everything passes, mana / AG / delay included: the cast may go out. */
export function canUseSkill(num: number): boolean {
  return skillUsability(num).usable;
}

// ---- 3. the layer ----------------------------------------------------------

export const usabilityLayer: SkillLayer = {
  name: 'usability',
};
