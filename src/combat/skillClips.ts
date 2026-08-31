/**
 * Which clip a cast plays. The `UseSkillWarrior` / `UseSkillWizard` /
 * `UseSkillElf` / `UseSkillSummon` / `UseSkillRagefighter` switches, the
 * `AttackKnight` / `AttackWizard` / `AttackCommon` branches and the
 * `ReceiveMagic` / `ReceiveMagicContinue` ladders of the original are one
 * table lookup over `recipes.ts` `SKILL_CLIPS`, plus the three things those
 * switches decide at run time and a table cannot:
 *
 *  - the **mount** (`c->Helper.Type`, and always `&& !c->SafeZone`),
 *  - the **map** — `AT_SKILL_RIDER` flies on Tarkan / Heaven / Maya,
 *  - the two random picks (`rand_fps_check(2)` for the Rage Fighter party
 *    buffs, `rand() % 2` for the male hand cast), which stay random.
 *
 * Readers only. Read by `common/skillCasting.chooseSkillAction`, which the
 * hero's `skillCastSystem` and the remote `playCastAnimation` both go
 * through, so everyone in scope plays the same clip for the same skill.
 */
import { PlayerAction } from '../common/objects/enum';
import type { MountKind } from '../common/pets';
import type { ENUM_WORLD } from '../common/types';
import type { CombatLayer } from './layer';
import {
  MAGIC_CLIPS,
  RAGE_BUFF_CLIPS,
  RAGE_BUFF_SKILLS,
  RIDER_CLIPS,
  RIDER_FLY_WORLDS,
  SKILL_CLIPS,
  SKILL_RIDER,
} from './recipes';

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
  /** `gCharacterManager.IsFemale(c->Class)` — Elf *and* Summoner. */
  readonly isFemale?: boolean;
  /** `gMapManager.WorldActive`, for the one map-dependent clip. */
  readonly world?: ENUM_WORLD;
  /** `rand() % 2` for the male hand cast; the caller alternates it. */
  readonly alternate?: boolean;
};

// ---- 2. state + readers ----------------------------------------------------

/**
 * `SetPlayerMagic` (ZzzCharacter.cpp:1238-1262): the generic cast clip a
 * skill with no dedicated one falls back to. Uniria and Dinorant share one
 * ride clip here — the four-way ladder is the castle-siege commands', not
 * this — and the Dark Horse has no branch at all, so its rider keeps the
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
 * skill) applies.
 */
export function skillClip(
  skill: number,
  ctx: CastContext = {}
): PlayerAction | null {
  // The party buffs are the one skill family that picks its clip by coin
  // toss rather than by caster (`rand_fps_check(2)`, :2866-2874).
  if (RAGE_BUFF_SKILLS.has(skill)) {
    return RAGE_BUFF_CLIPS[Math.random() < 0.5 ? 0 : 1];
  }

  // Rider: the map decides, not the caster.
  if (skill === SKILL_RIDER) {
    return ctx.world !== undefined && RIDER_FLY_WORLDS.has(ctx.world)
      ? RIDER_CLIPS.flying
      : RIDER_CLIPS.ground;
  }

  const set = SKILL_CLIPS[skill];
  if (!set) return null;
  if (ctx.mount) {
    const mounted = set[ctx.mount];
    if (mounted !== undefined) return mounted;
  }
  return set.ground;
}

/** Whether the skill has a dedicated clip (used to skip the alternate toggle). */
export function hasSkillClip(skill: number): boolean {
  return skill in SKILL_CLIPS || RAGE_BUFF_SKILLS.has(skill) || skill === SKILL_RIDER;
}

// ---- 3. the layer ----------------------------------------------------------

export const skillClipsLayer: CombatLayer = {
  name: 'skillClips',
};
