/**
 * The hero's `AttackTime` latch (w_CharacterInfo.h:247, ZzzCharacter.cpp:4018-4025):
 * a swing sets `AttackTime = 1`; every reference tick (25 Hz) adds one,
 * **independent of the clip's PlaySpeed**; `AttackStage` / `AttackEffect`
 * fire their sounds and sparks on `CheckAttackTime(n)` — true exactly once
 * per swing when the counter passes `n` — and the swing state ends when the
 * counter reaches `g_iLimitAttackTime` (15) or the clip reaches its hit key
 * (`AnimationFrame >= 5`, ZzzCharacter.cpp:2755 — the frame advances by
 * PlaySpeed per tick), which forces the counter to the limit.
 *
 * The original sends `SendHitRequest` on the click itself (ZzzInterface.cpp
 * :3355, right after `AttackTime = 1`); we latch the `HitRequest` to the hit
 * key instead so the packet lands with the blow: the consumer hands over a
 * callback, this entry fires it once when the clip reaches the key. Because
 * the key is reached at `key / PlaySpeed` ticks, a slow clip reaches it
 * *after* the 15-tick limit — the limit only ends the swing once the blow
 * has fired (see the table at `hitTickFor`). Driven by `attackSystem`
 * (`startAttack`); read by `attackSystem`, `combatSfxSystem` and any effect
 * that wants a hit-frame moment (`checkAttackTime`).
 */
import type { PlayerAction } from '../common/objects/enum';
import { REFERENCE_FPS } from '../common/playSpeed';
import type { ENUM_WORLD } from '../common/types';
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
 * later means the clip was cut short (shock, death, a lost model) — the
 * request is sent then so the server always sees exactly one per swing.
 */
const MAX_HIT_WAIT_TICKS = 40;

// ---- 2. state + readers ----------------------------------------------------

/** The running `AttackTime`, in reference ticks; 0 = no swing in flight. */
let attackTicks = 0;

/** `LastAttackEffectTime`: the tick a `checkAttackTime` already fired for. */
let lastEffectTick = -1;

/** Tick at which the current swing's blow lands. */
let hitTick = 0;

/** Latched hit callback; fired once per swing when `attackTicks >= hitTick`. */
let onHit: (() => void) | null = null;

/**
 * Tick at which a clip played at `playSpeed` keys per tick reaches its hit
 * key: `AttackTime` counts 1, 2, 3… at 25 Hz while `AnimationFrame` advances
 * by `playSpeed` per tick, so `AnimationFrame >= key` is true at
 * `1 + key / playSpeed`. The 15-tick limit must NOT cut this off:
 *
 * | PlaySpeed | who                        | hit tick (key 5) | seconds |
 * |-----------|----------------------------|------------------|---------|
 * | 0.25      | level-1 swordsman          | 21.0  (> 15)     | 0.84    |
 * | 0.36      | GM / ~30 attack speed      | 14.9  (≈ limit)  | 0.60    |
 * | 0.60      | fist / mid-game speed      |  9.3             | 0.37    |
 * | 1.00      | end-game speed             |  6.0             | 0.24    |
 *
 * `clipTicks` (the clip's length in ticks at this speed) caps it: if the
 * clip would end before the key, the blow lands with the clip's last frame.
 */
export function hitTickFor(
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

/** `AttackTime`, whole ticks. 0 while no swing is in flight. */
export function attackTime(): number {
  return Math.floor(attackTicks);
}

/** A swing is in flight (`AttackTime > 0`). */
export function attackInFlight(): boolean {
  return attackTicks > 0;
}

/** The current swing's blow has landed (hit request sent). */
export function attackHitLanded(): boolean {
  return attackTicks > 0 && onHit === null;
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
 * `hit` is called once when the clip reaches its hit key — send the
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
  if (attackTicks <= 0) return;

  attackTicks += dt * REFERENCE_FPS;

  if (onHit && attackTicks >= hitTick) {
    const fire = onHit;
    onHit = null;
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
