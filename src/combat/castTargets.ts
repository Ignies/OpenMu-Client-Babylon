/**
 * Who a cast is aimed at when the caster presses the button — the third
 * thing the original's skill switches decide and the skill table does not
 * say. `Skill.bmd` / OpenMU's `target` field is no help here: Soul Barrier
 * reads `Explicit` yet is cast on a party member *or* on yourself, and Swell
 * Life reads `ImplicitParty` yet always goes out as `HeroKey`.
 *
 * The original writes it as the key it puts in `SendRequestMagic`:
 *
 *  - `SendRequestMagic(Skill, HeroKey)` with the selection ignored — the
 *    self-only buffs (Swell Life :5658-5662, the elf summons :4841-4855,
 *    Infinity Arrow :4967-4975, Improve AG :5100-5104, Berserker :2646-2656,
 *    the Rage Fighter party buffs :2864-2880).
 *  - the selected **player**'s key when one is picked and is a party member,
 *    `HeroKey` otherwise — Soul Barrier :5851-5898, the elf party buffs and
 *    Heal (`UseSkillElf` :2496-2504), Recovery :4993-5010.
 *  - the selected object's key — everything else, which is every skill that
 *    is aimed at something hostile.
 *
 * Readers only. Read by `skillCastSystem`, which picks the target entity
 * before it sends, and by `common/skillCasting.isSelfCastable` for the
 * hotbar's greying.
 */
import type { SkillDefinition } from '../common/skillsDatabase';
import type { CombatLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Where a cast goes when the button is pressed. */
export type CastTarget =
  /** `HeroKey`, always — a selection on screen is ignored. */
  | 'self'
  /** The selected party member, or the caster when nothing suitable is picked. */
  | 'allyOrSelf'
  /** The selected object; the cast does not happen without one. */
  | 'enemy';

/**
 * Skills the original sends with `HeroKey` no matter what is selected.
 * Strengthened / mastery ids are listed beside their base skill because the
 * `case` lists name them.
 */
const SELF_ONLY: ReadonlySet<number> = new Set([
  48, 356, 360, // Swell Life, Str, Proficiency
  30, 31, 32, 33, 34, 35, 36, 37, // the elf summons (AT_SKILL_SUMMON + 0..7)
  53, // Improve AG
  77, 441, // Infinity Arrow, Str
  218, 469, // Berserker, Str
  266, // Ignore Defense
  267, 573, // Increase Health, Str
  268, 569, 572, // Increase Block, Str, Mastery
  205, 206, 207, 208, 209, // the Halloween event skills
]);

/**
 * Skills cast on the selected party member when there is one, and on the
 * caster otherwise. Teleport Ally is not here: it needs a party member and
 * is refused without one, which `skillCasting.castTeleport` enforces.
 */
const ALLY_OR_SELF: ReadonlySet<number> = new Set([
  16, 403, 404, // Soul Barrier, Str, Proficiency
  26, 413, // Heal, Str
  27, 417, 423, // Greater Defense, Str, Mastery
  28, 420, 422, // Greater Damage, Str, Mastery
  234, // Recovery
]);

// ---- 2. state + readers ----------------------------------------------------

/**
 * Where the cast goes. Anything the original does not name explicitly falls
 * back to the skill table's own shape: a buff / regeneration / summon with
 * no named rule is cast on the caster, everything else on the selection.
 */
export function castTarget(def: SkillDefinition): CastTarget {
  if (SELF_ONLY.has(def.num)) return 'self';
  if (ALLY_OR_SELF.has(def.num)) return 'allyOrSelf';
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

/** Whether the selection is ignored outright (`HeroKey`, always). */
export function castsOnSelfOnly(def: SkillDefinition): boolean {
  return castTarget(def) === 'self';
}

// ---- 3. the layer ----------------------------------------------------------

export const castTargetsLayer: CombatLayer = {
  name: 'castTargets',
};
