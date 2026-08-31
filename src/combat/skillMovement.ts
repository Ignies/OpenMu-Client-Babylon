/**
 * What a cast does to where the hero *is*, as opposed to what it plays.
 * Three separate rules of the original, none of which lived anywhere before:
 *
 *  - **stop** — every `UseSkill*` opens with `LetHeroStop()`
 *    (ZzzInterface.cpp:1935): the path is dropped and a one-step move is sent
 *    so the server puts the caster on the square he is standing on. A cast is
 *    never taken mid-stride.
 *  - **step in** — the Rage Fighter's contact skills relocate the caster to
 *    the square one tile short of the target and send `InstantMoveRequest`
 *    (`CMonkSystem::SendAttackPacket`, MonkSystem.cpp:445-485; the same maths
 *    is inlined for Killing Blow / Occupy at ZzzInterface.cpp:2760-2780).
 *    Beast Uppercut, Chain Drive and Dragon Slasher do it *mid-clip*, on the
 *    consecutive-attack frame (`IsRageHalfwaySkillAni`), which is why they
 *    read as a lunge; Killing Blow and Occupy do it as the cast starts.
 *  - **root** — a clip that holds the caster's facing while it plays
 *    (`bLookAtMouse = false`, :7394-7419). Everything else keeps turning to
 *    the cursor.
 *
 * Rush (44) is the fourth skill that moves its caster, and the only one the
 * client does nothing about: the server answers the cast with the new square,
 * so it needs no row here.
 *
 * Readers only. Read by `skillCastSystem`, which owns the hero's path and yaw.
 */
import { PlayerAction } from '../common/objects/enum';
import type { CombatLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/**
 * `AT_SKILL_KILLING_BLOW` / `_STR` / `_MASTERY` and `AT_SKILL_OCCUPY`: the
 * step lands as the cast is sent.
 */
const STEP_IN_ON_CAST: ReadonlySet<number> = new Set([260, 551, 554, 269]);

/**
 * `CMonkSystem::IsRageHalfwaySkillAni` (MonkSystem.cpp:428-442): Beast
 * Uppercut, Chain Drive and Dragon Slasher send their packet — and so take
 * their step — on the consecutive-attack frame partway through the clip.
 */
const STEP_IN_MID_CLIP: ReadonlySet<number> = new Set([
  261, 552, 555, // Beast Uppercut, Str, Mastery
  262, 558, // Chain Drive, Str
  265, // Dragon Slasher
]);

/**
 * The animation key the mid-clip step fires on. `InitConsecutiveState` arms
 * the check at 3.0 for every one of them (UseSkillRagefighter:2790-2830); the
 * second window (7.0 / 12.0) is the follow-up blow, not a second step.
 */
export const CONSECUTIVE_ATTACK_KEY = 3;

/**
 * Clips that hold the caster's facing for their whole length — the original
 * skips the look-at-cursor update for them (`bLookAtMouse = false`,
 * ZzzInterface.cpp:7394-7419). Rageful Blow spins in place, Chain Drive
 * swings the target round, and Beast Uppercut / Dragon Slasher would
 * otherwise snap away from the body they are throwing.
 */
const FACING_HELD_CLIPS: ReadonlySet<PlayerAction> = new Set([
  PlayerAction.PLAYER_ATTACK_SKILL_FURY_STRIKE,
  PlayerAction.PLAYER_SKILL_GIANTSWING,
]);

// ---- 2. state + readers ----------------------------------------------------

/**
 * Whether the skill relocates the caster, and when. `null` = the caster
 * stands still and only the clip plays.
 */
export function skillStepIn(skill: number): 'cast' | 'midClip' | null {
  if (STEP_IN_ON_CAST.has(skill)) return 'cast';
  if (STEP_IN_MID_CLIP.has(skill)) return 'midClip';
  return null;
}

/**
 * The square a step-in lands on: one tile short of the target, along the
 * line from the caster (`VectorNormalize` × `TERRAIN_SCALE`, subtracted from
 * the target — MonkSystem.cpp:452-460). Returns `null` when caster and
 * target share a square.
 */
export function stepInSquare(
  from: { x: number; y: number },
  target: { x: number; y: number }
): { x: number; y: number } | null {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return null;
  return { x: target.x - dx / len, y: target.y - dy / len };
}

/** Whether the clip holds the caster's facing for its whole length. */
export function clipHoldsFacing(clip: PlayerAction): boolean {
  return FACING_HELD_CLIPS.has(clip);
}

// ---- 3. the layer ----------------------------------------------------------

export const skillMovementLayer: CombatLayer = {
  name: 'skillMovement',
};
