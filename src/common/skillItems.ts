import type { Item } from '../ecs/world';
import { classCanUse, type HeroStats, type ItemStats } from './itemStats';
import { skillDefinition } from './skillsDatabase';
import { t } from '../i18n';

/**
 * Learning skills from orbs, scrolls and crystals: right-click the item in
 * the inventory (`CNewUIMyInventory::UseItem`, NewUIMyInventory.cpp:1865).
 * Pure rules only - the packet (0x26 ConsumeItemRequest, ItemSlot = the
 * orb / scroll) is sent by `Store.learnSkillItem`, the answer (`SkillAdded`
 * F3 11 / `ItemConsumptionFailed`) lands in logic.ts.
 *
 * Server truth (OpenMU `LearnablesConsumeHandlerPlugIn`): the item's
 * definition names the skill, the hero's class must be on the item's class
 * list, the item's requirements must be met and the skill must not be
 * known yet. Item.txt carries no skill column for these rows, so the table
 * below maps item -> skill number the way OpenMU's `Orbs.cs` / `Scrolls.cs`
 * seed it; the original enum names (_enum.h:2613-2853) are kept beside each
 * row for cross-checking.
 */

/** Orbs / crystals / Dark Lord scrolls share the wing group. */
export const ORB_GROUP = 12;
/** Wizard and Summoner scrolls (`ITEM_SCROLL_OF_POISON` = ITEM_ETC + 0). */
export const SCROLL_GROUP = 15;

/**
 * `ITEM_ORB_OF_SUMMONING` teaches Summon Goblin .. Summon Soldier by item
 * level (ZzzInventory.cpp:1754: `SkillAttribute[30 + iLevel]`).
 */
const ORB_OF_SUMMONING = 11;
const SUMMON_FIRST_SKILL = 30;
const SUMMON_LAST_SKILL = 36;

/** Group 12 index -> skill number. */
const ORB_SKILLS: Readonly<Record<number, number>> = {
  7: 41, // ITEM_ORB_OF_TWISTING_SLASH
  8: 26, // ITEM_ORB_OF_HEALING
  9: 27, // ITEM_ORB_OF_GREATER_DEFENSE
  10: 28, // ITEM_ORB_OF_GREATER_DAMAGE
  12: 42, // ITEM_ORB_OF_RAGEFUL_BLOW
  13: 47, // ITEM_ORB_OF_IMPALE
  14: 48, // ITEM_ORB_OF_GREATER_FORTITUDE -> Swell Life
  16: 55, // ITEM_ORB_OF_FIRE_SLASH
  17: 52, // ITEM_ORB_OF_PENETRATION
  18: 51, // ITEM_ORB_OF_ICE_ARROW
  19: 43, // ITEM_ORB_OF_DEATH_STAB
  21: 61, // ITEM_SCROLL_OF_FIREBURST
  22: 63, // ITEM_SCROLL_OF_SUMMON
  23: 64, // ITEM_SCROLL_OF_CRITICAL_DAMAGE
  24: 65, // ITEM_SCROLL_OF_ELECTRIC_SPARK
  35: 78, // ITEM_SCROLL_OF_FIRE_SCREAM
  44: 232, // ITEM_CRYSTAL_OF_DESTRUCTION -> Strike of Destruction
  45: 235, // ITEM_CRYSTAL_OF_MULTI_SHOT
  46: 234, // ITEM_CRYSTAL_OF_RECOVERY
  47: 236, // ITEM_CRYSTAL_OF_FLAME_STRIKE
  48: 238, // ITEM_SCROLL_OF_CHAOTIC_DISEIER
};

/** Group 15 index -> skill number. */
const SCROLL_SKILLS: Readonly<Record<number, number>> = {
  0: 1, // ITEM_SCROLL_OF_POISON
  1: 2, // ITEM_SCROLL_OF_METEORITE
  2: 3, // ITEM_SCROLL_OF_LIGHTING
  3: 4, // ITEM_SCROLL_OF_FIRE_BALL
  4: 5, // ITEM_SCROLL_OF_FLAME
  5: 6, // ITEM_SCROLL_OF_TELEPORT
  6: 7, // ITEM_SCROLL_OF_ICE
  7: 8, // ITEM_SCROLL_OF_TWISTER
  8: 9, // ITEM_SCROLL_OF_EVIL_SPIRIT
  9: 10, // ITEM_SCROLL_OF_HELLFIRE
  10: 11, // ITEM_SCROLL_OF_POWER_WAVE
  11: 12, // ITEM_SCROLL_OF_AQUA_BEAM
  12: 13, // ITEM_SCROLL_OF_COMETFALL
  13: 14, // ITEM_SCROLL_OF_INFERNO
  14: 15, // ITEM_SCROLL_OF_TELEPORT_ALLY
  15: 16, // ITEM_SCROLL_OF_SOUL_BARRIER
  16: 38, // ITEM_SCROLL_OF_DECAY
  17: 39, // ITEM_SCROLL_OF_ICE_STORM
  18: 40, // ITEM_SCROLL_OF_NOVA
  19: 214, // Drain Life
  20: 215, // Chain Lightning
  21: 230, // Lightning Shock ("Electric Surge")
  22: 217, // Damage Reflection ("Reflex")
  23: 218, // Berserker ("Sword Power")
  24: 219, // Sleep
  25: 221, // Weakness ("Magic Speed Up")
  26: 222, // Innovation ("Magic Defense Up")
  27: 223, // Explosion ("Red Storm")
  28: 233, // ITEM_SCROLL_OF_WIZARDRY_ENHANCE -> Expansion of Wizardry
  29: 237, // ITEM_SCROLL_OF_GIGANTIC_STORM
};

/**
 * The skill number `group`/`index` at item level `level` teaches, or
 * undefined for anything that is not a learnable.
 */
export function learnableSkillNumber(
  group: number,
  index: number,
  level = 0
): number | undefined {
  if (group === ORB_GROUP) {
    if (index === ORB_OF_SUMMONING) {
      const skill = SUMMON_FIRST_SKILL + Math.max(0, level);
      return skill <= SUMMON_LAST_SKILL ? skill : undefined;
    }
    return ORB_SKILLS[index];
  }
  if (group === SCROLL_GROUP) return SCROLL_SKILLS[index];
  return undefined;
}

/** The skill number `item` teaches, or undefined when it teaches none. */
export function learnableSkill(item: Item): number | undefined {
  return learnableSkillNumber(item.group, item.num, item.lvl ?? 0);
}

/** True for every orb / scroll / crystal that teaches a skill. */
export function isSkillItem(item: Item): boolean {
  return learnableSkill(item) !== undefined;
}

/**
 * Why `hero` cannot learn from `item` right now, or null when the use may
 * go to the server. `stats` are the item's effective requirements
 * (`itemStats(item)`, which already folds the skill's own level / energy
 * in); `known` are the skill numbers on the hero's list.
 *
 * The original checks level, energy and strength in silence
 * (NewUIMyInventory.cpp:1899) and leaves class and "already learned" to the
 * server's refusal; every reason is spelled out here instead, in the order
 * the tooltip lists the requirements.
 */
export function learnSkillError(
  item: Item,
  stats: ItemStats,
  hero: HeroStats,
  known: readonly number[]
): string | null {
  const number = learnableSkill(item);
  if (number === undefined) return t('skills.teachesNothing');

  const name = skillDefinition(number)?.name ?? t('skills.thisSkill');

  if (!classCanUse(stats.def, hero)) {
    return t('skills.classCannotLearn', { name });
  }
  if (known.includes(number)) return t('skills.alreadyKnown', { name });

  const short = (label: string, required: number, have: number) =>
    t('skills.needMore', { label, required, name, more: required - have });

  if (hero.level < stats.reqLvl) return short('Level', stats.reqLvl, hero.level);
  if (hero.str < stats.reqStr) return short('Strength', stats.reqStr, hero.str);
  if (hero.agi < stats.reqAgi) return short('Agility', stats.reqAgi, hero.agi);
  if (hero.vit < stats.reqVit) return short('Vitality', stats.reqVit, hero.vit);
  if (hero.ene < stats.reqEne) return short('Energy', stats.reqEne, hero.ene);
  if (hero.cmd < stats.reqCmd) return short('Command', stats.reqCmd, hero.cmd);

  return null;
}
