/**
 * Who a cast is aimed at when the caster presses the button - the third
 * thing the original's skill switches decide and the skill table does not
 * say. `Skill.bmd` / OpenMU's `target` field is no help here: Soul Barrier
 * reads `Explicit` yet is cast on a party member *or* on yourself, and Swell
 * Life reads `ImplicitParty` yet always goes out as `HeroKey`.
 *
 * The original writes it as the key it puts in `SendRequestMagic`:
 *
 *  - `SendRequestMagic(Skill, HeroKey)` with the selection ignored - the
 *    self-only buffs (Swell Life :5658-5662, the elf summons :4841-4855,
 *    Infinity Arrow :4967-4975, Improve AG :5100-5104, Berserker :2646-2656,
 *    the Rage Fighter party buffs :2864-2880).
 *  - the selected **player**'s key when one is picked and is a party member,
 *    `HeroKey` otherwise - Soul Barrier :5851-5898, the elf party buffs and
 *    Heal (`UseSkillElf` :2496-2504), Recovery :4993-5010.
 *  - the selected object's key - everything else, which is every skill that
 *    is aimed at something hostile.
 *
 * Readers only. Read by `skillCastSystem`, which picks the target entity
 * before it sends, and by `common/skillCasting.isSelfCastable` for the
 * hotbar's greying.
 */
import type { SkillDefinition } from '@versions/shared/skills/skillsDatabase';
import type { CombatLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Where a cast goes when the button is pressed. */
export type CastTarget =
  /** `HeroKey`, always - a selection on screen is ignored. */
  | 'self'
  /** The selected party member, or the caster when nothing suitable is picked. */
  | 'allyOrSelf'
  /** The selected object; the cast does not happen without one. */
  | 'enemy'
  /** No target at all: an area cast on the caster's own tile, the selection ignored. */
  | 'inPlace';

/**
 * Skills whose rule the original names in its switches, by skill number. Each
 * skill's own file sets `target` (registerSkills fills this table); the rows
 * here have no skill file. Rules: 'self' = sent with HeroKey whatever is
 * selected; 'allyOrSelf' = the selected party member, else the caster;
 * 'enemy' = refused without a live selection (Sleep, ClassAttack.cpp:1694-1735);
 * 'inPlace' = at the hero's own tile with no target key (SkillCast.cpp:722-741).
 */
export const SKILL_TARGETS: Partial<Record<number, CastTarget>> = {
  37: 'self',
  205: 'self',
  206: 'self',
  207: 'self',
  208: 'self',
  209: 'self', // the Halloween event skills
};

// ---- 2. state + readers ----------------------------------------------------

/**
 * Where the cast goes. Anything the original does not name explicitly falls
 * back to the skill table's own shape: a buff / regeneration / summon with
 * no named rule is cast on the caster, everything else on the selection.
 */
export function castTarget(def: SkillDefinition): CastTarget {
  const own = SKILL_TARGETS[def.num];
  if (own) return own;
  if (
    def.type === 'Buff' ||
    def.type === 'Regeneration' ||
    def.type === 'SummonMonster' ||
    def.type === 'PassiveBoost' ||
    def.target === 'ImplicitParty' ||
    def.target === 'ImplicitPlayer'
  ) {
    return 'allyOrSelf';
  }
  return 'enemy';
}

/** Whether a cast with nothing suitable selected lands on the caster. */
export function castsOnSelf(def: SkillDefinition): boolean {
  return castTarget(def) !== 'enemy';
}

/** Whether the cast is an area cast on the caster's own tile, with no target at all. */
export function castsInPlace(def: SkillDefinition): boolean {
  return castTarget(def) === 'inPlace';
}

/** Whether the selection is ignored outright (`HeroKey`, always). */
export function castsOnSelfOnly(def: SkillDefinition): boolean {
  return castTarget(def) === 'self';
}

// ---- 3. the layer ----------------------------------------------------------

export const castTargetsLayer: CombatLayer = {
  name: 'castTargets',
};
