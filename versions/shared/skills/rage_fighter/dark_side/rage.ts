/**
 * Rage Fighter packets (MonkSystem.cpp, SkillCast.cpp:881-896,
 * WSclient.cpp:14952-14957): Dark Side (263, 559) is the one skill on its own
 * wire - the cast sends `RageAttackRangeRequest` (0x4B) *and*
 * `RageAttackRequest` (0x4A) at the picked target; the server answers 0x4B
 * with up to five targets it chose (`ReceiveDarkside` →
 * `SetDarksideTargetIndex`) and echoes the 0x4A (`ReceiveStraightAttack`,
 * which sets the caster's `AttackTime = 1`, :13422-13429), and the client then
 * lands a blow on each target as the clip's follow-ups come round, counted from
 * that echo (`SendDarksideAtt`, one per `m_nDarksideCnt`). The blows are drawn
 * only: their 0x4A send is commented out (MonkSystem.cpp:610).
 * Every other Rage Fighter skill is a plain `TargetedSkill` / `AreaSkill`
 * with its own clip (`SetRageSkillAni`, `recipes.ts`).
 *
 * The streak the server reports back (`ObjectHit.IsRageFighterStreakHit` /
 * `…FinalHit`, the original's `bRepeatedly` / `bEndRepeatedly`) is kept here
 * for the damage-number stack (`CMonkSystem::SetRepeatedly`).
 *
 * Driven by `skillCastSystem` (`beginDarkSide`) and the combat module's
 * packet handlers (`observeDarkSideTargets`, `observeDarkSideEcho`,
 * `observeRageHit`); the cast system draws the due follow-ups it pulls
 * through the facade's `nextDarkSideHit`.
 */
import type { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import type { CombatLayer } from '@/controllers/combat/layer';
import { playCombat } from '@/controllers/sound';
import { PlayerAction } from '../../../objects/enum';
import { heroEntity } from '../../_shared';

/** AT_SKILL_DARKSIDE and AT_SKILL_DARKSIDE_STR: the Rage Fighter skills on the 0x4A/0x4B pair (SkillCast.cpp:881-896). */
const DARK_SIDE_SKILLS: readonly number[] = [263, 559];

// ---- 1. tuning -------------------------------------------------------------

/** `DARKSIDE_TARGET_MAX`: the server names at most five. */
const DARK_SIDE_MAX_TARGETS = 5;

/** One original tick, seconds. */
const TICK = 0.04;

/** PLAYER_SKILL_DARKSIDE_READY's PlaySpeed at attack speed 0 (SetAttackSpeed, ZzzCharacter.cpp:1021). */
const READY_SPEED = 0.3;

/**
 * Follow-up spacing: the next blow goes once `AttackTime >= (int)(2.5 / PlaySpeed)` (SkillCast.cpp:1117-1129).
 * AttackTime runs 1, 2, ... a tick from the server's echo of the cast, so the first comes that many ticks after it;
 * each blow sets it back to 1 and AttackStage adds 1 the same tick (ZzzCharacter.cpp:4132-4136), so the next ones
 * are a tick sooner.
 */
export const darkSideHitTicks = (playSpeed: number): number => Math.trunc(2.5 / playSpeed);

/** `g_iLimitAttackTime`: AttackTime stops when it reaches 15 (ZzzCharacter.cpp:171, :4139-4141). */
const LIMIT_ATTACK_TIME = 15;

/** The hero's DARKSIDE_READY PlaySpeed while he plays it, else 0: a follow-up only comes in the clip (SkillCast.cpp:1117). */
function readySpeed(): number {
  const m = heroEntity()?.modelObject;
  if (m?.CurrentAction !== PlayerAction.PLAYER_SKILL_DARKSIDE_READY) return 0;
  return m.AnimationSpeed > 0 ? m.AnimationSpeed : READY_SPEED;
}

/** Seconds a streak stays open with no further hit before it is considered done. */
const STREAK_TIMEOUT = 1.0;

// ---- 2. state + readers ----------------------------------------------------

/** Dark Side skill of the hero's last cast (263 or 559), 0 = none. */
let darkSideSkill = 0;
/** Targets the server named, still to be hit. */
const pendingTargets: number[] = [];
/** The server echoed the cast: a later echo repeats it. */
let echoed = false;
/** The hero's AttackTime in ticks: 1 at the echo of his cast and at each blow, 0 once it reached 15. */
let attackTime = 0;
/** The target whose blow came due this frame, -1 for none. */
let dueTarget = -1;

/** Hits in the current streak; 0 when none is open. */
let streakHits = 0;
let streakOpenFor = 0;

/** Whether `skill` is Dark Side or its Strengthener. */
export function isDarkSide(skill: number): boolean {
  return DARK_SIDE_SKILLS.includes(skill);
}

/** Hits landed in the running Rage Fighter streak, 0 outside one. */
export function rageStreak(): number {
  return streakHits;
}

/** Command: Dark Side was cast on `targetId`; the 0x4B/0x4A pair goes out now. The follow-ups wait for its echo. */
export function beginDarkSide(skill: number, _targetId: number): void {
  darkSideSkill = skill;
  pendingTargets.length = 0;
  echoed = false;
  attackTime = 0;
}

/**
 * Command: the server echoed a 0x4A of `caster`'s. True when it repeats a Dark Side cast already drawn, which
 * RageCreateEffect draws once (MonkSystem.cpp:1285-1288): the hero's after the echo of his cast, which alone sets
 * his `AttackTime = 1` and so starts the follow-ups (WSclient.cpp:13422-13429); another caster's while he still
 * plays the Dark Side clip, which SetRageSkillAni leaves running (ZzzAI.cpp:425).
 */
export function observeDarkSideEcho(skill: number, caster: Entity): boolean {
  if (!isDarkSide(skill)) return false;
  if (!caster.localPlayer) return caster.playerAnimation?.action === PlayerAction.PLAYER_SKILL_DARKSIDE_READY;
  if (echoed) return true;
  if (darkSideSkill === 0) return false;
  echoed = true;
  attackTime = 1;
  return false;
}

/** Command: the 0x4B response arrived with the targets the server picked; any target plays Rage_Darkside_Att (MonkSystem.cpp:551-558). */
export function observeDarkSideTargets(skill: number, targetIds: readonly number[]): void {
  if (!isDarkSide(skill) || darkSideSkill === 0) return;
  pendingTargets.length = 0;
  for (const id of targetIds.slice(0, DARK_SIDE_MAX_TARGETS)) pendingTargets.push(id);
  if (pendingTargets.length > 0) playCombat('Sound/Ragefighter/Rage_Darkside_Att', null);
}

/**
 * Command: pull the follow-up target whose blow came due this frame. Returns the
 * target id, or `-1` when none is due. The caller draws the blow; nothing goes
 * out (`SendDarksideAtt`'s send is commented out, MonkSystem.cpp:610).
 */
export function nextDarkSideHit(): number {
  const id = dueTarget;
  dueTarget = -1;
  return id;
}

/** The Dark Side skill of the hero's last cast, whose blow the follow-ups draw. */
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
  dueTarget = -1;
  if (attackTime > 0) {
    // MoveHero's UseSkillRagePosition reads AttackTime, then MoveCharacter runs it on (MainScene.cpp:283-284).
    const speed = readySpeed();
    if (speed > 0 && pendingTargets.length > 0 && attackTime + 1e-9 >= darkSideHitTicks(speed)) {
      dueTarget = pendingTargets.shift() ?? -1;
      attackTime = 1;
    }
    attackTime += dt / TICK;
    if (attackTime + 1e-9 >= LIMIT_ATTACK_TIME) attackTime = 0;
  }
  if (streakOpenFor > 0) {
    streakOpenFor -= dt;
    if (streakOpenFor <= 0) streakHits = 0;
  }
}

function reset(): void {
  darkSideSkill = 0;
  pendingTargets.length = 0;
  echoed = false;
  attackTime = 0;
  dueTarget = -1;
  streakHits = 0;
  streakOpenFor = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const rageLayer: CombatLayer = {
  name: 'rage',
  update,
  reset,
};
