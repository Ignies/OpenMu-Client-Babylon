/**
 * The hero's `AttackTime` latch (w_CharacterInfo.h:247, ZzzCharacter.cpp:4018-4025,
 * :2755; ZzzInterface.cpp:3355). The hit request fires on the hit key. See controllers/combat/readme.md.
 */
import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';
import { REFERENCE_FPS } from '../anim/playSpeed';
import type { ENUM_WORLD } from '../../core/types';
import type { CombatLayer } from './layer';
import { DEFAULT_HIT_KEY, HIT_KEYS } from './recipes';

// ---- 1. tuning -------------------------------------------------------------

/** `g_iLimitAttackTime = 15`: ticks after which a landed swing is over regardless. */
const LIMIT_ATTACK_TICKS = 15;

/** `AttackTime = 1` on the frame the swing starts. */
const FIRST_TICK = 1;

/**
 * Smallest play speed a clip is stepped at. A stat-scaled PlaySpeed is never
 * 0 in practice (bases are 0.24…0.6); this only keeps the division finite.
 */
const MIN_PLAY_SPEED = 0.01;

/**
 * Fallback ceiling on how long a blow may stay pending, in ticks (1.6 s).
 * The slowest real clip (0.24 keys/tick, key 5) lands at tick 21.8; anything
 * later means the clip was cut short (shock, death, a lost model) - the
 * request is sent then so the server always sees exactly one per swing.
 */
const MAX_HIT_WAIT_TICKS = 40;

/** Seconds a sent blow can still be the one its kill packet answers (a round trip, with room). */
const BLOW_KILL_WINDOW = 1;

// ---- 2. state + readers ----------------------------------------------------

/** The running `AttackTime`, in reference ticks; 0 = no swing in flight. */
let attackTicks = 0;

/** `LastAttackEffectTime`: the tick a `checkAttackTime` already fired for. */
let lastEffectTick = -1;

/** Tick at which the current swing's blow lands. */
let hitTick = 0;

/** Latched hit callback; fired once per swing when `attackTicks >= hitTick`. */
let onHit: (() => void) | null = null;

/** Ticks the last blow's request waited past its swing start, and seconds since it went out. */
let blowHeld = 0;
let sinceBlow = Infinity;

/**
 * Ticks the hero's last hit request was held past its swing start, while its kill can still arrive.
 * The original sends it on the click (ZzzInterface.cpp:3355); `DeathSystem` counts the Die clip's
 * 14 ticks from there.
 */
export function blowHeldTicks(): number {
  return sinceBlow <= BLOW_KILL_WINDOW ? blowHeld : 0;
}

/**
 * Tick at which a clip at `playSpeed` reaches its hit key: `1 + key / playSpeed`,
 * capped by `clipTicks`. The 15-tick limit must not cut it off. See controllers/combat/readme.md.
 */
function hitTickFor(
  action: PlayerAction,
  playSpeed: number,
  clipTicks = Infinity
): number {
  const key = HIT_KEYS[action] ?? DEFAULT_HIT_KEY;
  const keyTick = FIRST_TICK + key / Math.max(MIN_PLAY_SPEED, playSpeed);
  return Math.min(keyTick, FIRST_TICK + clipTicks, MAX_HIT_WAIT_TICKS);
}

/** Seconds from the swing start to its blow at the given clip speed. */
export function hitDelaySeconds(action: PlayerAction, playSpeed: number): number {
  return (hitTickFor(action, playSpeed) - FIRST_TICK) / REFERENCE_FPS;
}

/** A cast's release at the latest: AttackTime runs from 1 at its packet to the limit 15 (ZzzCharacter.cpp:4132-4140). */
export const RELEASE_TICKS = LIMIT_ATTACK_TICKS - FIRST_TICK;

/** `ATTACK_IMPACT_FRAME`: AttackStage's default key (ZzzCharacter.cpp:2587). */
export const RELEASE_KEY = 5;

/**
 * The clips AttackStage's default case watches for the key: `IsAttackAction`, PLAYER_ATTACK_FIST ..
 * PLAYER_RIDE_SKILL, on a player rig, MONSTER01_ATTACK1 .. 2 on a monster's (PlayerActionState.h:13,
 * ZzzCharacter.cpp:2589-2604). Any other clip waits the 14 ticks out.
 */
export function releasesOnKey(action: number, monsterRig: boolean): boolean {
  return monsterRig
    ? action >= MonsterActionType.Attack1 && action <= MonsterActionType.Attack2
    : action >= PlayerAction.PLAYER_ATTACK_FIST && action <= PlayerAction.PLAYER_RIDE_SKILL;
}

/** `AttackTime`, whole ticks. 0 while no swing is in flight. */
export function attackTime(): number {
  return Math.floor(attackTicks);
}

/** A swing is in flight (`AttackTime > 0`). */
export function attackInFlight(): boolean {
  return attackTicks > 0;
}

/**
 * `CheckAttackTime(n)`: true once per swing, on the frame the counter sits
 * on tick `n`. Mark it consumed with `setLastAttackEffectTime()` like the
 * original, so several checks on the same tick can share it.
 */
export function checkAttackTime(tick: number): boolean {
  return attackTime() === tick && lastEffectTick !== tick;
}

/** `SetLastAttackEffectTime()`. */
export function setLastAttackEffectTime(): void {
  lastEffectTick = attackTime();
}

/**
 * Command: a swing started now with `action` at `playSpeed` keys per tick.
 * `hit` is called once when the clip reaches its hit key - send the
 * `HitRequest` there. `clipSeconds` (one iteration of the clip at this
 * speed) is the fallback: the blow never waits past the clip's end.
 * Returns the seconds until that moment.
 */
export function startAttack(
  action: PlayerAction,
  playSpeed: number,
  hit: () => void,
  clipSeconds = Infinity
): number {
  attackTicks = FIRST_TICK;
  lastEffectTick = -1;
  hitTick = hitTickFor(action, playSpeed, clipSeconds * REFERENCE_FPS);
  onHit = hit;
  return (hitTick - FIRST_TICK) / REFERENCE_FPS;
}

/** Command: drop the swing without landing it (target vanished, hero died). */
export function cancelAttack(): void {
  attackTicks = 0;
  lastEffectTick = -1;
  hitTick = 0;
  onHit = null;
}

function update(_map: ENUM_WORLD, dt: number): void {
  sinceBlow += dt;
  if (attackTicks <= 0) return;

  attackTicks += dt * REFERENCE_FPS;

  if (onHit && attackTicks >= hitTick) {
    const fire = onHit;
    onHit = null;
    blowHeld = attackTicks - FIRST_TICK;
    sinceBlow = 0;
    fire();
    // AttackStage: the hit key forces AttackTime to the limit.
    attackTicks = LIMIT_ATTACK_TICKS;
  }

  // The limit ends a swing only once its blow has fired: a clip slower than
  // 5/14 keys per tick reaches its hit key after tick 15 and must still land.
  if (onHit === null && attackTicks >= LIMIT_ATTACK_TICKS) {
    attackTicks = 0;
    lastEffectTick = -1;
  }
}

function reset(): void {
  cancelAttack();
  blowHeld = 0;
  sinceBlow = Infinity;
}

// ---- self-check: the table above, in code ---------------------------------
// Every row must land after the swing starts and before the fallback ceiling,
// and the slow rows must land past the 15-tick limit (the bug this guards).
{
  const rows: [number, number][] = [
    [0.25, 21],
    [0.36, 14.9],
    [0.6, 9.3],
    [1.0, 6],
  ];
  for (const [speed, expected] of rows) {
    const tick = hitTickFor(0 as PlayerAction, speed);
    const ok =
      Math.abs(tick - expected) < 0.1 && tick > FIRST_TICK && tick <= MAX_HIT_WAIT_TICKS;
    if (!ok) console.warn(`attackTiming: hit tick at PlaySpeed ${speed} = ${tick}, expected ${expected}`);
  }
}

// ---- 3. the layer ----------------------------------------------------------

export const attackTimingLayer: CombatLayer = {
  name: 'attackTiming',
  update,
  reset,
};
