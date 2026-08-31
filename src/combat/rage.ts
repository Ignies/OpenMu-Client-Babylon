/**
 * Rage Fighter packets (MonkSystem.cpp, ZzzInterface.cpp:2835-2845,
 * WSclient.cpp:14228-14233): Dark Side (263) is the one skill on its own
 * wire — the cast sends `RageAttackRangeRequest` (0x4B) *and*
 * `RageAttackRequest` (0x4A) at the picked target; the server answers 0x4B
 * with up to five targets it chose (`ReceiveDarkside` →
 * `SetDarksideTargetIndex`), and the client then lands one 0x4A per extra
 * target as the clip's follow-up blows come round (`SendDarksideAtt`, one
 * per `m_nDarksideCnt`). Every other Rage Fighter skill is a plain
 * `TargetedSkill` / `AreaSkill` with its own clip (`SetRageSkillAni`,
 * `recipes.ts`).
 *
 * The streak the server reports back (`ObjectHit.IsRageFighterStreakHit` /
 * `…FinalHit`, the original's `bRepeatedly` / `bEndRepeatedly`) is kept here
 * for the damage-number stack (`CMonkSystem::SetRepeatedly`).
 *
 * Driven by `skillCastSystem` (`beginDarkSide`), `logic.ts`
 * (`observeDarkSideTargets`, `observeRageHit`); the pending follow-ups are
 * drained by the facade's `drainDarkSideHits` from the cast system.
 */
import type { ENUM_WORLD } from '../common/types';
import type { CombatLayer } from './layer';
import { SKILL_DARK_SIDE } from './recipes';

// ---- 1. tuning -------------------------------------------------------------

/** `DARKSIDE_TARGET_MAX`: the server names at most five. */
const DARK_SIDE_MAX_TARGETS = 5;

/**
 * Seconds between follow-up blows. `m_fOtherAniFrame` advances
 * `(AttackTime + 1) * 0.2` per hit (MonkSystem.cpp:715): one blow every
 * five reference ticks.
 */
const DARK_SIDE_HIT_INTERVAL = 0.2;

/** Seconds a streak stays open with no further hit before it is considered done. */
const STREAK_TIMEOUT = 1.0;

// ---- 2. state + readers ----------------------------------------------------

/** Dark Side skill in flight (263 or a strengthened variant), 0 = none. */
let darkSideSkill = 0;
/** Extra targets the server named, still to be hit. */
const pendingTargets: number[] = [];
/** Seconds until the next follow-up blow may go out. */
let nextHitIn = 0;

/** Hits in the current streak; 0 when none is open. */
let streakHits = 0;
let streakOpenFor = 0;

/** Whether `skill` is Dark Side (the server sends the base id back). */
export function isDarkSide(skill: number): boolean {
  return skill === SKILL_DARK_SIDE;
}

/** A Dark Side cast is waiting for or working through its targets. */
export function darkSideActive(): boolean {
  return darkSideSkill !== 0;
}

/** Hits landed in the running Rage Fighter streak, 0 outside one. */
export function rageStreak(): number {
  return streakHits;
}

/** Command: Dark Side was cast on `targetId`; the 0x4B/0x4A pair goes out now. */
export function beginDarkSide(skill: number, _targetId: number): void {
  darkSideSkill = skill;
  pendingTargets.length = 0;
  nextHitIn = DARK_SIDE_HIT_INTERVAL;
}

/** Command: the 0x4B response arrived with the targets the server picked. */
export function observeDarkSideTargets(skill: number, targetIds: readonly number[]): void {
  if (!isDarkSide(skill) || darkSideSkill === 0) return;
  pendingTargets.length = 0;
  for (const id of targetIds.slice(0, DARK_SIDE_MAX_TARGETS)) pendingTargets.push(id);
}

/**
 * Command: pull the next follow-up target whose blow is due. Returns the
 * target id, or `-1` when none is due this frame. The caller sends 0x4A.
 */
export function nextDarkSideHit(): number {
  if (darkSideSkill === 0 || pendingTargets.length === 0 || nextHitIn > 0) return -1;
  nextHitIn = DARK_SIDE_HIT_INTERVAL;
  const id = pendingTargets.shift()!;
  if (pendingTargets.length === 0) darkSideSkill = 0;
  return id;
}

/** The skill id to put in the follow-up 0x4A. */
export function darkSidePendingSkill(): number {
  return darkSideSkill;
}

/** Command: an `ObjectHit` flagged as part of a Rage Fighter streak arrived. */
export function observeRageHit(isStreak: boolean, isFinal: boolean): void {
  if (!isStreak && !isFinal) return;
  streakHits++;
  streakOpenFor = STREAK_TIMEOUT;
  if (isFinal) {
    streakHits = 0;
    streakOpenFor = 0;
  }
}

function update(_map: ENUM_WORLD, dt: number): void {
  if (nextHitIn > 0) nextHitIn -= dt;
  if (streakOpenFor > 0) {
    streakOpenFor -= dt;
    if (streakOpenFor <= 0) streakHits = 0;
  }
}

function reset(): void {
  darkSideSkill = 0;
  pendingTargets.length = 0;
  nextHitIn = 0;
  streakHits = 0;
  streakOpenFor = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const rageLayer: CombatLayer = {
  name: 'rage',
  update,
  reset,
};
