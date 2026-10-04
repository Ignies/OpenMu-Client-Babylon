/**
 * Rage Fighter packets (MonkSystem.cpp, ZzzInterface.cpp:2835-2845,
 * WSclient.cpp:14228-14233): Dark Side (263) is the one skill on its own
 * wire - the cast sends `RageAttackRangeRequest` (0x4B) *and*
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
 * Driven by `skillCastSystem` (`beginDarkSide`), `app/logic.ts`
 * (`observeDarkSideTargets`, `observeRageHit`); the pending follow-ups are
 * drained by the facade's `drainDarkSideHits` from the cast system.
 */
import type { ENUM_WORLD } from '@/core/types';
import type { CombatLayer } from '@/controllers/combat/layer';
import { playCombat } from '@/controllers/sound';
import { PlayerAction } from '../../../objects/enum';
import { heroEntity } from '../../_shared';

/** AT_SKILL_DARKSIDE: the one Rage Fighter skill that uses the 0x4A/0x4B pair. */
const SKILL_DARK_SIDE = 263;

// ---- 1. tuning -------------------------------------------------------------

/** `DARKSIDE_TARGET_MAX`: the server names at most five. */
const DARK_SIDE_MAX_TARGETS = 5;

/** One original tick, seconds. */
const TICK = 0.04;

/** PLAYER_SKILL_DARKSIDE_READY's PlaySpeed at attack speed 0 (SetAttackSpeed, ZzzCharacter.cpp:1021). */
const READY_SPEED = 0.3;

/**
 * Follow-up spacing: the next blow goes once `AttackTime >= (int)(2.5 / PlaySpeed)` (SkillCast.cpp:1117-1129).
 * AttackTime runs 1, 2, ... a tick from the cast, so the first comes that many ticks after it; each blow sets it
 * back to 1 and AttackStage adds 1 the same tick (ZzzCharacter.cpp:4132-4136), so the next ones are a tick sooner.
 */
export const darkSideHitTicks = (playSpeed: number): number => Math.trunc(2.5 / playSpeed);

/** The hero's DARKSIDE_READY PlaySpeed while he plays it, else the base one. */
function readySpeed(): number {
  const m = heroEntity()?.modelObject;
  return m?.CurrentAction === PlayerAction.PLAYER_SKILL_DARKSIDE_READY && m.AnimationSpeed > 0 ? m.AnimationSpeed : READY_SPEED;
}

/** Seconds a streak stays open with no further hit before it is considered done. */
const STREAK_TIMEOUT = 1.0;

// ---- 2. state + readers ----------------------------------------------------

/** Dark Side skill in flight (263 or a strengthened variant), 0 = none. */
let darkSideSkill = 0;
/** Extra targets the server named, still to be hit. */
const pendingTargets: number[] = [];
/** Seconds since the cast or the last follow-up blow. */
let sinceHit = 0;
/** Follow-up blows sent this cast. */
let hitsSent = 0;

/** Hits in the current streak; 0 when none is open. */
let streakHits = 0;
let streakOpenFor = 0;

/** Whether `skill` is Dark Side (the server sends the base id back). */
export function isDarkSide(skill: number): boolean {
  return skill === SKILL_DARK_SIDE;
}

/** Hits landed in the running Rage Fighter streak, 0 outside one. */
export function rageStreak(): number {
  return streakHits;
}

/** Command: Dark Side was cast on `targetId`; the 0x4B/0x4A pair goes out now. */
export function beginDarkSide(skill: number, _targetId: number): void {
  darkSideSkill = skill;
  pendingTargets.length = 0;
  sinceHit = 0;
  hitsSent = 0;
}

/** Command: the 0x4B response arrived with the targets the server picked; any target plays Rage_Darkside_Att (MonkSystem.cpp:551-558). */
export function observeDarkSideTargets(skill: number, targetIds: readonly number[]): void {
  if (!isDarkSide(skill) || darkSideSkill === 0) return;
  pendingTargets.length = 0;
  for (const id of targetIds.slice(0, DARK_SIDE_MAX_TARGETS)) pendingTargets.push(id);
  if (pendingTargets.length > 0) playCombat('Sound/Ragefighter/Rage_Darkside_Att', null);
}

/**
 * Command: pull the next follow-up target whose blow is due. Returns the
 * target id, or `-1` when none is due this frame. The caller sends 0x4A.
 */
export function nextDarkSideHit(): number {
  if (darkSideSkill === 0 || pendingTargets.length === 0) return -1;
  const due = darkSideHitTicks(readySpeed()) - (hitsSent > 0 ? 1 : 0);
  if (sinceHit + 1e-9 < due * TICK) return -1;
  sinceHit = 0;
  hitsSent++;
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
  sinceHit += dt;
  if (streakOpenFor > 0) {
    streakOpenFor -= dt;
    if (streakOpenFor <= 0) streakHits = 0;
  }
}

function reset(): void {
  darkSideSkill = 0;
  pendingTargets.length = 0;
  sinceHit = 0;
  hitsSent = 0;
  streakHits = 0;
  streakOpenFor = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const rageLayer: CombatLayer = {
  name: 'rage',
  update,
  reset,
};
