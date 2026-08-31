import { ENUM_WORLD } from '../common/types';
import type { WeatherLayer } from './layer';
import { Store } from '../store';
import { CHAOS_CASTLE_WORLDS, DEVIL_SQUARE_WORLDS } from '../common/worldAssets';

/**
 * Rain strength, ported from `RainTarget` / `RainCurrent`
 * (ZzzEffectFireLeave.cpp:27-28, 422-452).
 *
 * The weather byte's meaning is no longer an assumption — `ReceiveWeather`
 * (WSclient.cpp:6716) reads it as:
 *
 * ```cpp
 * int Weather = (Data->Value >> 4);
 * if (Weather == 0)      RainTarget = 0;
 * else if (Weather == 1) RainTarget = (Data->Value & 15) * 6;
 * ```
 *
 * So the high nibble is the kind (**0 clear, 1 rain — confirmed**, and no
 * other value does anything: snow is a property of the map, never of this
 * packet) and the low nibble is the **intensity**, which the clone was
 * discarding. `RainTarget` lands in 0…90, `Rainly = RainCurrent * MAX_LEAVES
 * / 100` with `MAX_LEAVES = 200` (_define.h:443), so `RainCurrent / 100` is
 * the share of the full particle budget — that is the number below.
 *
 * `RainCurrent` chases `RainTarget` by one unit per reference frame rather
 * than snapping, which is what stops a weather packet from switching a
 * downpour on between two frames. At 25 Hz that is 0.25 of full strength per
 * second, a ~4 s ramp across the whole range — and four seconds is where the
 * port stops being useful, because a shower that arrives in four seconds
 * reads as a switch. See `RAMP_UP_SECONDS`.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Server weather kind 1 = rain (`ReceiveWeather`, WSclient.cpp:6722). */
export const WEATHER_RAIN = 1;

/**
 * How long a shower takes to arrive, and how long it takes to leave.
 *
 * **This is a deliberate divergence from the port.** The original's chase is
 * one `RainTarget` unit per 25 Hz frame — 0.25 of the full range per second,
 * so ~4 s from clear to a downpour and 4 s back. On screen that is not a
 * shower, it is a switch with a short delay on it: the rain is either there
 * or not, and because a drop only lives about a second the *field* follows
 * the rate almost without lag, so there is nothing else in the chain to hide
 * the corner.
 *
 * A shower is a thing with a shape. It starts as a few small slow drops,
 * fills in, sits, and thins out again — and the thinning takes longer than
 * the filling, because a cloud runs out of its heaviest rain before it runs
 * out of rain. Hence the asymmetry: half a minute in, three quarters of a
 * minute out.
 *
 * This is only one of three stages that smooth the sky, and it is worth
 * knowing where each acts, because a change here will be invisible if the
 * wrong one is dominating:
 *
 *  1. the proxy eases its own intensity with a smoothstep between slot
 *     centres, over minutes — the weather itself changing its mind;
 *  2. this ramp, over tens of seconds — the shower arriving and leaving;
 *  3. the emitter's own rate slew (`AmbientRecipe.ramp`, 2.5 s for rain) —
 *     the last corner off the emit rate.
 *
 * Under `WEATHER_FORCE` the first stage is bypassed, so what a test sees is
 * exactly the number below.
 */
const RAMP_UP_SECONDS = 26;
const RAMP_DOWN_SECONDS = 45;

/** Full range per second, each way. */
const RAMP_UP_PER_SECOND = 1 / RAMP_UP_SECONDS;
const RAMP_DOWN_PER_SECOND = 1 / RAMP_DOWN_SECONDS;

/**
 * Maps that rain constantly and ignore the server. `MoveLeaves` overwrites
 * `RainTarget` every frame for Icarus (`MAX_LEAVES / 2` = 100, full
 * strength; ZzzEffectFireLeave.cpp:424-426), for Devil Square
 * (`CreateDevilSquareRain`, the full `MAX_LEAVES` budget, :422) and for
 * Chaos Castle (`InChaosCastle()` takes the same branch, :428-436).
 */
const ALWAYS_RAINING: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_10ICARUS,
  ...DEVIL_SQUARE_WORLDS,
  ...CHAOS_CASTLE_WORLDS,
]);

// ---- 2. state + readers ----------------------------------------------------

let current = 0;
/** False until the first `updateRain` after a reset — see `resetRain`. */
let seeded = false;

/** The target the packet (or the map) asks for, in 0…1. */
export function rainTarget(map: ENUM_WORLD): number {
  if (ALWAYS_RAINING.has(map)) return 1;

  const { weather, variation } = Store.weather;

  if (weather !== WEATHER_RAIN) return 0;

  // `(Value & 15) * 6` over the 100 that `Rainly` divides by.
  return Math.min(1, (variation * 6) / 100);
}

/** Advances `RainCurrent` toward the target; call once a frame. */
export function updateRain(map: ENUM_WORLD, dt: number): number {
  const target = rainTarget(map);

  // First frame on a new map: the shower on the other side of the gate is
  // already falling at this strength, so start there rather than ramping up
  // to it. See `resetRain`.
  if (!seeded) {
    seeded = true;
    current = target;
    return current;
  }

  if (current < target) {
    current = Math.min(target, current + RAMP_UP_PER_SECOND * dt);
  } else if (current > target) {
    current = Math.max(target, current - RAMP_DOWN_PER_SECOND * dt);
  }

  return current;
}

/** `RainCurrent`, 0…1. Zero means no rain is falling *right now*. */
export function rainStrength(): number {
  return current;
}

/**
 * A map change re-seeds the rain rather than re-ramping it.
 *
 * This deliberately does **not** clear `Store.weather`. The sky is global —
 * one schedule in the proxy for every client — so the shower is genuinely
 * still falling on the other side of the gate, and the player should walk out
 * into the rain it was already raining.
 *
 * It used to zero `current` and let the ~4 s ramp fade the rain back in,
 * which was a fair trade at four seconds and is not one at
 * `RAMP_UP_SECONDS`: half a minute of near-clear sky after every gate, on a
 * map where the ground is already wet, because `wetness` seeds itself from
 * the *target*. So the next `updateRain` takes the target whole.
 *
 * Nothing snaps on screen, because a warp disposes the emitters anyway
 * (`ambientParticleSystem`'s one hard cut) and a fresh one still opens its
 * rate over its own `ramp`. That 2.5 s is the arrival, and it is the right
 * length for one: the shower is not starting, the player is.
 *
 * Maps that must never rain (indoor, or snow maps) are excluded by the rain
 * slot itself.
 */
export function resetRain(): void {
  current = 0;
  seeded = false;
}

// ---- 3. the layer ----------------------------------------------------------

/** The layer (see layer.ts). Every map: rain is a server packet, not a map. */
export const rainLayer: WeatherLayer = {
  name: 'rain',
  update: updateRain,
  reset: resetRain,
};
