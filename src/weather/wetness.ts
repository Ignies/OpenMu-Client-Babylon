import { ENUM_WORLD } from '../common/types';
import type { WeatherLayer } from './layer';
import { rainStrength, rainTarget } from './rainState';

/**
 * How wet the ground is, 0…1, and how much of that has collected into
 * standing water.
 *
 * The falling drops are particles (`RAIN`); this is what they leave behind.
 * The original client has nothing like it; the roadmap lists
 * `BITMAP_RAIN_CIRCLE` splashes as missing and they were never ground
 * contact anyway — so this is our own, and like `snowCover` it is a
 * *simulation* rather than a lookup: stone darkens while the shower falls and
 * dries out slowly afterwards, which is the whole reason a passing shower
 * leaves a mark on the map instead of switching a texture on and off.
 *
 * Two numbers come out of it because wet stone and standing water behave
 * differently. Stone goes dark within seconds of the first drops and stays
 * dark long after they stop; a puddle needs the rain to keep falling long
 * enough to collect, and then sits there evaporating. `puddleCover` therefore
 * lags `wetness` on the way up and outlives it on the way down.
 */

/** Maps that get wet ground. Snow maps are excluded — Devias gets snow cover. */
// ---- 1. tuning -------------------------------------------------------------

const WET_MAPS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_0LORENCIA,
  ENUM_WORLD.WD_3NORIA,
]);

/** Seconds of full rain to soak dry ground. Stone darkens fast. */
const WET_BUILD_SECONDS = 22;

/** Seconds for soaked ground to dry out once the sky clears. */
const WET_DRY_SECONDS = 150;

/**
 * How soaked ground gets, as a multiple of the rain's intensity.
 *
 * Without this, wetness only ever asked *is it raining* and crept to fully
 * soaked either way, so a drizzle left the same black streets as a downpour
 * if you waited long enough — and eventually crossed the puddle threshold,
 * which is plainly wrong for rain you can barely see. Ground now approaches a
 * ceiling set by the intensity instead. The packet tops out at 0.9
 * (`variation` 15 x 6 / 100), so the gain is what lets real rain still reach
 * a fully soaked 1.0, while a 1-of-15 drizzle settles at a tenth of that.
 */
const SOAK_GAIN = 1.6;

/** Ground has to be at least this wet before water starts standing on it. */
// Down from 0.55. Wetness asymptotes to rain x SOAK_GAIN, so 0.55 needed
// rain >= 0.34 - intensity 6 of 15 - before a single puddle could form, and
// the proxy's showers start at 4/15. Everything short of a moderate shower
// darkened the streets and never pooled. At 0.35 a 4/15 shower (0.24 x 1.6
// = 0.38) just crosses it after its 22 s soak and pools slowly; a drizzle
// under that still never does.
const PUDDLE_THRESHOLD = 0.35;

/** Seconds of rain on already-soaked ground to fill the puddles. */
const PUDDLE_BUILD_SECONDS = 45;

/** Seconds for full puddles to evaporate. Slower than the ground dries. */
const PUDDLE_DRY_SECONDS = 210;

// ---- 2. state + readers ----------------------------------------------------

let wet = 0;
let puddles = 0;
let lastMap: ENUM_WORLD | null = null;

/**
 * Advances both accumulators; call once a frame. Returns the ground wetness.
 *
 * Arriving on a map mid-shower seeds the wetness from the *packet's* target
 * rather than from `rainStrength()`. `resetRain` deliberately zeroes the live
 * ramp on a warp so the rain fades in instead of snapping, which means for the
 * first few seconds after a gate `rainStrength()` says "dry" while the sky is
 * plainly pouring. Seeding from the target avoids walking into a downpour over
 * bone-dry stone.
 */
export function updateWetness(map: ENUM_WORLD, dt: number): number {
  if (!WET_MAPS.has(map)) {
    wet = 0;
    puddles = 0;
    lastMap = map;
    return 0;
  }

  if (map !== lastMap) {
    lastMap = map;
    const seed = rainTarget(map);
    wet = seed;
    puddles = seed > PUDDLE_THRESHOLD ? seed * 0.5 : 0;
    return wet;
  }

  const rain = rainStrength();
  const soakTarget = Math.min(1, rain * SOAK_GAIN);

  if (wet < soakTarget) {
    wet = Math.min(soakTarget, wet + (rain * dt) / WET_BUILD_SECONDS);
  } else {
    // Also the path taken when the rain eases without stopping: ground that
    // was soaked by a downpour dries back to what a drizzle can hold.
    wet = Math.max(soakTarget, wet - dt / WET_DRY_SECONDS);
  }

  // Water only starts standing once the ground under it has given up
  // absorbing, and it can only ever be as deep as the ground is wet.
  const canPool = rain > 0 && wet >= PUDDLE_THRESHOLD;


  if (canPool) {
    puddles = Math.min(1, puddles + (rain * dt) / PUDDLE_BUILD_SECONDS);
  } else {
    puddles = Math.max(0, puddles - dt / PUDDLE_DRY_SECONDS);
  }

  puddles = Math.min(puddles, wet);

  return wet;
}

/** Ground wetness, 0…1 — the broad darkening. */
export function wetness(): number {
  return wet;
}

/** Standing water, 0…1 — the sharp-edged dark patches on flat ground. */
export function puddleCover(): number {
  return puddles;
}

/**
 * Whether the tile under a walker should be treated as standing water.
 *
 * Deliberately a single global test rather than a lookup into the puddle
 * noise field: the field lives in the shader, and mirroring it on the CPU
 * would mean keeping two copies of the same hash in step forever. Footprints
 * only need to know whether there is water about to be walked through, and
 * `puddleCover` above ~0.3 means a good share of the flat ground is under it.
 */
export function inPuddles(): boolean {
  return puddles > 0.3;
}

/** Drop both — a map change that is not to a wet map, or a teardown. */
export function resetWetness(): void {
  wet = 0;
  puddles = 0;
  lastMap = null;
}

/** The layer (see layer.ts). Must be stepped after `rainLayer`. */
// ---- 3. the layer ----------------------------------------------------------

export const wetnessLayer: WeatherLayer = {
  name: 'wetness',
  maps: WET_MAPS,
  update: updateWetness,
  reset: resetWetness,
};
