/**
 * What a cast does to where the hero is: stop (ZzzInterface.cpp:1935), step in
 * (MonkSystem.cpp:445-485), root (ZzzInterface.cpp:7394-7419). See controllers/combat/readme.md.
 */
import type { PlayerAction } from '@versions/shared/objects/enum';
import type { CombatLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/**
 * When a skill walks the caster one square in toward the target, by skill
 * number: 'cast' as the cast is sent, 'midClip' on the consecutive-attack
 * frame partway through the clip. Each skill's file sets `stepIn`.
 */
export const SKILL_STEP_IN: Partial<Record<number, 'cast' | 'midClip'>> = {};
/**
 * The animation key the mid-clip step fires on. `InitConsecutiveState` arms
 * the check at 3.0 for every one of them (UseSkillRagefighter:2790-2830); the
 * second window (7.0 / 12.0) is the follow-up blow, not a second step.
 */
export const CONSECUTIVE_ATTACK_KEY = 3;

/**
 * Clips that hold the caster's facing for their whole length - the original
 * skips the look-at-cursor update for them (`bLookAtMouse = false`,
 * ZzzInterface.cpp:7394-7419). Each skill lists its clips in `holdsFacing`
 * (Rageful Blow spins in place, Chain Drive swings the target round).
 */
export const FACING_HELD_CLIPS: Set<PlayerAction> = new Set();

// ---- 2. state + readers ----------------------------------------------------

/**
 * Whether the skill relocates the caster, and when. `null` = the caster
 * stands still and only the clip plays.
 */
export function skillStepIn(skill: number): 'cast' | 'midClip' | null {
  return SKILL_STEP_IN[skill] ?? null;
}

/**
 * The square a step-in lands on: one tile short of the target, along the
 * line from the caster (`VectorNormalize` × `TERRAIN_SCALE`, subtracted from
 * the target - MonkSystem.cpp:452-460). Returns `null` when caster and
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
