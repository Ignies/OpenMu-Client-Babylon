import type { ENUM_WORLD } from '../../core/types';
import type { WeatherLayer } from './layer';
import { WeatherStatus } from './status';
import { maps } from '../maps';

/**
 * Rain strength, from `RainTarget` / `RainCurrent` (ZzzEffectFireLeave.cpp:27-28, 422-452).
 * Weather byte as `ReceiveWeather` reads it (WSclient.cpp:6716): high nibble 0 clear / 1 rain,
 * `RainTarget = (Value & 15) * 6`; `RainCurrent / 100` is the share of `MAX_LEAVES` (_define.h:443).
 */

// ---- 1. tuning -------------------------------------------------------------

/** Server weather kind 1 = rain (`ReceiveWeather`, WSclient.cpp:6722). */
export const WEATHER_RAIN = 1;

/**
 * Seconds for a shower to arrive and to leave. A deliberate divergence: the original chases one
 * unit per 25 Hz frame (~4 s), which reads as a switch. Middle of three smoothing stages (readme.md).
 */
const RAMP_UP_SECONDS = 26;
const RAMP_DOWN_SECONDS = 45;

/** Full range per second, each way. */
const RAMP_UP_PER_SECOND = 1 / RAMP_UP_SECONDS;
const RAMP_DOWN_PER_SECOND = 1 / RAMP_DOWN_SECONDS;

/*
 * Maps that rain constantly and ignore the server declare it themselves
 * (`MapWeather.alwaysRain`): Icarus, Devil Square and Chaos Castle, whose
 * `RainTarget` `MoveLeaves` overwrites every frame.
 */

// ---- 2. state + readers ----------------------------------------------------

let current = 0;
/** False until the first `updateRain` after a reset - see `resetRain`. */
let seeded = false;

/** Whether a world rains at full strength whatever the packet says. */
export function alwaysRains(map: ENUM_WORLD): boolean {
  return maps.layerFor(map)?.weather?.alwaysRain === true;
}

/** The target the packet (or the map) asks for, in 0…1. */
export function rainTarget(map: ENUM_WORLD): number {
  if (alwaysRains(map)) return 1;

  // The packet is global. A map where rain cannot fall stays dry under it,
  // so the ground, the splashes and the sound all agree with the sky.
  if (!maps.canRain(map)) return 0;

  const { weather, variation } = WeatherStatus.weather;

  if (weather !== WEATHER_RAIN) return 0;

  // `(Value & 15) * 6` over the 100 that `Rainly` divides by.
  return Math.min(1, (variation * 6) / 100);
}

/** Advances `RainCurrent` toward the target; call once a frame. */
function updateRain(map: ENUM_WORLD, dt: number): number {
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
 * A map change re-seeds the rain instead of re-ramping it: `WeatherStatus.weather` is kept (the sky is
 * global) and the next `updateRain` takes the target whole. Dry maps get a zero `rainTarget`.
 */
function resetRain(): void {
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
