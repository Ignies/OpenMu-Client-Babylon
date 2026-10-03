/**
 * Which clip a cast plays: the `UseSkill*` / `Attack*` / `ReceiveMagic` switches
 * as one lookup over `SKILL_CLIPS`, plus mount and the skills' own picks. See controllers/combat/readme.md.
 */
import { PlayerAction } from '@versions/shared/objects/enum';
import type { MountKind } from '../../modules/pets/pets';
import type { ENUM_WORLD } from '../../core/types';
import type { CombatLayer } from './layer';
import type { Hands } from './weaponRange';
import { masterBase } from '../../modules/skills/skillAliases';
import { MAGIC_CLIPS, SKILL_CLIPS } from './recipes';

// ---- 1. tuning -------------------------------------------------------------

/**
 * What the clip switches need to know about the caster. Everything here is
 * one field of `CHARACTER` in the original: `Helper.Type` (already collapsed
 * to `null` inside a safe zone by `mountKind`), `IsFemale(Class)`, and the
 * active world.
 */
export type CastContext = {
  /** `c->Helper.Type`, or `null` on foot / in a safe zone. */
  readonly mount?: MountKind | null;
  /** `gCharacterManager.IsFemale(c->Class)` - Elf *and* Summoner. */
  readonly isFemale?: boolean;
  /** `gMapManager.WorldActive`, for the one map-dependent clip. */
  readonly world?: ENUM_WORLD;
  /** `rand() % 2` for the male hand cast; the caller alternates it. */
  readonly alternate?: boolean;
};

/** What a pose-picked clip reads off the caster: the `AttackPose` the swing rules build. */
export type CastPose = {
  readonly hands: Hands;
  /** `BaseClass` of the caster. */
  readonly baseClass: number;
  /** `c->SwordCount`: swings so far. */
  readonly swordCount: number;
};

/** A clip picked from the caster's hands and swing count; `null` = fall through to the clip table. */
export type PoseClip = (pose: CastPose, ctx: CastContext) => PlayerAction | null;

/**
 * The per-skill clip rules beside `SKILL_CLIPS`, by exact skill number, each filled by
 * `registerSkills` from the skill's file:
 * - `SKILL_POSE_CLIPS`: picks ahead of the clip table (Plasma Storm by hands, Slash's odd swing).
 * - `SKILL_SWINGS`: the skill swings a weapon clip of the attack rules ('highBow': Starfall).
 * - `SKILL_SWORD_COUNT`: whether the cast advances `SwordCount`, where the clip rule alone is wrong.
 * - `SPELL_CAST_SKILLS`: cast with `SetPlayerMagic` though the table types them physical.
 * - `SKILL_OTHERS_SEE`: the clip everyone else plays in place of one of the skill's own.
 * - `SKILL_QUIET_MOUNTS`: mounts on which the cast is dropped for others and silent for the hero.
 */
export const SKILL_POSE_CLIPS: Record<number, PoseClip> = {};
export const SKILL_SWINGS: Record<number, 'highBow'> = {};
export const SKILL_SWORD_COUNT: Record<number, boolean> = {};
export const SPELL_CAST_SKILLS: Set<number> = new Set();
export const SKILL_OTHERS_SEE: Record<number, Partial<Record<PlayerAction, PlayerAction>>> = {};
export const SKILL_QUIET_MOUNTS: Record<number, readonly MountKind[]> = {};

// ---- 2. state + readers ----------------------------------------------------

/**
 * `SetPlayerMagic` (ZzzCharacter.cpp:1238-1262): the generic cast clip a
 * skill with no dedicated one falls back to. Uniria and Dinorant share one
 * ride clip here - the four-way ladder is the castle-siege commands', not
 * this - and the Dark Horse has no branch at all, so its rider keeps the
 * hand clip.
 */
export function magicClip(ctx: CastContext = {}): PlayerAction {
  switch (ctx.mount) {
    case 'uniria':
      return MAGIC_CLIPS.uniria;
    case 'dinorant':
      return MAGIC_CLIPS.dinorant;
    case 'fenrir':
      return MAGIC_CLIPS.fenrir;
    default:
      break;
  }
  if (ctx.isFemale) return MAGIC_CLIPS.female;
  return MAGIC_CLIPS.male[ctx.alternate ? 1 : 0];
}

/**
 * The clip for a skill, or `null` when the skill has no dedicated clip and
 * the generic rule (`magicClip` for a spell, the weapon swing for a physical
 * skill) applies. A skill that picks its own (a coin toss, the map) is asked.
 */
export function skillClip(
  skill: number,
  ctx: CastContext = {}
): PlayerAction | null {
  const set = SKILL_CLIPS[skill] ?? SKILL_CLIPS[masterBase(skill)];
  if (!set) return null;
  if (typeof set === 'function') return set(ctx);
  if (ctx.mount) {
    const mounted = set[ctx.mount];
    if (mounted !== undefined) return mounted;
  }
  return set.ground;
}

/** Whether the skill has a dedicated clip (used to skip the alternate toggle). */
export function hasSkillClip(skill: number): boolean {
  return skill in SKILL_CLIPS || masterBase(skill) in SKILL_CLIPS;
}

/** The skill's own pick from the caster's hands, ahead of the clip table; `null` when it has none. */
export function poseClip(skill: number, pose: CastPose, ctx: CastContext = {}): PlayerAction | null {
  return SKILL_POSE_CLIPS[skill]?.(pose, ctx) ?? null;
}

/** The attack-rule swing the skill casts with instead of a clip, if any. */
export function castSwing(skill: number): 'highBow' | null {
  return SKILL_SWINGS[skill] ?? null;
}

/** Whether the cast advances `SwordCount`, when the skill says so itself; `undefined` = the clip rule decides. */
export function swordCountRule(skill: number): boolean | undefined {
  return SKILL_SWORD_COUNT[skill];
}

/** Whether a skill the table types physical still casts with `SetPlayerMagic`. */
export function castsAsSpell(skill: number): boolean {
  return SPELL_CAST_SKILLS.has(skill);
}

/** The clip others in scope play for the skill's `clip` (the same unless the skill says otherwise). */
export function othersSeeClip(skill: number, clip: PlayerAction): PlayerAction {
  const row = SKILL_OTHERS_SEE[skill] ?? SKILL_OTHERS_SEE[masterBase(skill)];
  return row?.[clip] ?? clip;
}

/** Whether a cast on this mount is dropped for others and silent for the hero. */
export function castQuietOn(skill: number, mount: MountKind | null | undefined): boolean {
  return !!mount && !!SKILL_QUIET_MOUNTS[skill]?.includes(mount);
}

// ---- 3. the layer ----------------------------------------------------------

export const skillClipsLayer: CombatLayer = {
  name: 'skillClips',
};
