import type { ENUM_WORLD } from '../../core/types';
import type { WeatherLayer } from './layer';

/**
 * Snow melted off the ground by fire skills: at most `MELT_SPOTS` patches in a uniform array, no
 * texture. A leaf module: importing another weather file here is a load-order crash. See readme.md.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * Patches alive at once.
 *
 * Eight, and that is Inferno's number: `CreateInferno` throws its bombs at
 * 45° around a 2.2-tile ring, which is wider apart than the merge below can
 * join, so anything less turns the one skill built out of eight ground hits
 * into a ring with gaps in it. The fragment loop is a `length()` and a
 * `smoothstep` per slot - a fraction of what the reflection pool's six
 * lights cost - and nearby hits merge rather than each claiming a slot, so a
 * sustained barrage widens one scar instead of exhausting the array.
 */
export const MELT_SPOTS = 8;

/** Seconds from the hit to bare ground. Fire is fast; this is nearly a cut. */
const OPEN_SECONDS = 0.35;

/** Seconds the patch stays fully open before the snow starts closing it. */
const HOLD_SECONDS = 5;

/**
 * Seconds for the snow to take the patch back.
 *
 * Long enough that a fight leaves a readable mess on the field, short enough
 * that a player walking back over their own tracks finds the map whole again.
 * Deliberately faster than the trail's `FILL_SECONDS` (240): a channel is
 * displaced snow that has to be snowed over, a melt is water that refreezes.
 */
const CLOSE_SECONDS = 28;

/**
 * A new hit closer than this share of an existing patch's radius grows that
 * patch instead of taking a slot of its own. Just inside the rim, so two
 * blasts that visibly overlap become one scar.
 */
const MERGE_FRACTION = 0.8;

/** Tiles a merged hit adds to the patch it joined, and the ceiling on that. */
const MERGE_GROWTH = 0.25;
const MAX_RADIUS = 4;

/**
 * Where the edge of a patch starts, as a share of the radius. The snow does
 * not stop at a line - it thins over the last half of the circle, which is
 * what makes it read as melted rather than as a stencil.
 */
export const MELT_EDGE = 0.45;

/**
 * How far a patch's edge departs from a circle, per harmonic of the bearing.
 *
 * A melt was a perfect disc, and a disc is the one shape that says "stamped"
 * rather than "melted" - a fire skill worked over a snowfield left a row of
 * identical coins. The second harmonic gives a patch a long axis and the third
 * and fifth break that into lobes.
 *
 * The phases come out of the spot's own position (see the GLSL in
 * `terrainOverlay.ts`), so a patch keeps its outline for as long as it lives
 * and no two are alike, without a byte more uniform: the shape is three sines
 * of a bearing the loop already has to compute the distance.
 */
export const MELT_LOBE_2 = 0.2;
export const MELT_LOBE_3 = 0.12;
export const MELT_LOBE_5 = 0.07;

// ---- 2. state + readers ----------------------------------------------------

type Spot = {
  x: number;
  z: number;
  radius: number;
  /** Seconds since the hit that opened (or last widened) this patch. */
  age: number;
  /** Dead slots carry 0 and are what `alloc` reuses. */
  strength: number;
};

const spots: Spot[] = Array.from({ length: MELT_SPOTS }, () => ({
  x: 0,
  z: 0,
  radius: 0,
  age: 0,
  strength: 0,
}));

/** `setArray4` wants a flat array and must not allocate one per frame. */
const uniform: number[] = new Array(MELT_SPOTS * 4).fill(0);

/** Slots from the front of `uniform` the shader has to read. */
let uniformCount = MELT_SPOTS;

/**
 * How much of a patch's life is left, 1…0 - full until the snow starts
 * closing it, then down the fill ramp to nothing.
 *
 * Separate from `envelope` because the opening ramp is not a claim on the
 * slot. Scored by the envelope, a patch made this frame is worth 0 and the
 * allocator reads it as free: a volley that lands in one frame - Inferno's
 * eight bombs, a chain of fireballs - then piles every hit into the same slot
 * and only the last one is ever seen.
 */
function life(age: number): number {
  const closing = age - OPEN_SECONDS - HOLD_SECONDS;
  if (closing <= 0) return 1;
  return Math.max(0, 1 - closing / CLOSE_SECONDS);
}

/** How open a patch of this age is, 0…1: a quick rise, a hold, a slow close. */
function envelope(age: number): number {
  return age < OPEN_SECONDS ? age / OPEN_SECONDS : life(age);
}

/** `smoothstep(a, b, x)`, so the CPU falloff is the shader's to the letter. */
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Melt a circle of snow at world (x, z). `radius` is in tiles, `strength`
 * 0…1 is how much of the snow the fire takes at the centre.
 *
 * Called by the fire rows of `common/skillVisuals.ts`. Free to call on a map
 * with no meltable layer: nothing samples the patches there, and the map
 * change clears them.
 */
export function meltSnow(
  x: number,
  z: number,
  radius: number,
  strength = 1
): void {
  if (radius <= 0 || strength <= 0) return;

  // A hit inside an existing patch widens it and makes it young again, which
  // is what turns a barrage into one spreading scar instead of six circles.
  for (const s of spots) {
    if (s.strength <= 0) continue;
    const dx = x - s.x;
    const dz = z - s.z;
    if (Math.sqrt(dx * dx + dz * dz) > s.radius * MERGE_FRACTION) continue;

    s.radius = Math.min(MAX_RADIUS, Math.max(s.radius, radius) + MERGE_GROWTH);
    s.strength = Math.max(s.strength, strength);
    // Back to the end of the rise, not to zero: the ground here is already
    // bare, and restarting the ramp would make it flash white for a frame.
    s.age = Math.min(s.age, OPEN_SECONDS);
    return;
  }

  // Otherwise the emptiest slot: a free one (strength 0), else the patch
  // closest to healed. Scored on `life`, never on the envelope - see there.
  let slot = spots[0];
  let best = slot.strength * life(slot.age);
  for (const s of spots) {
    const score = s.strength * life(s.age);
    if (score < best) {
      slot = s;
      best = score;
    }
  }

  slot.x = x;
  slot.z = z;
  slot.radius = Math.min(MAX_RADIUS, radius);
  slot.strength = strength;
  slot.age = 0;
}

/**
 * How much of the snow at (x, z) has been melted away, 0…1. The shader's own
 * falloff, on the CPU, for the sink and the footprints.
 */
export function snowMeltAt(x: number, z: number): number {
  let melt = 0;

  for (const s of spots) {
    if (s.strength <= 0) continue;
    const dx = x - s.x;
    const dz = z - s.z;
    const d = Math.sqrt(dx * dx + dz * dz) / s.radius;
    if (d >= 1) continue;

    const here = s.strength * envelope(s.age) * (1 - smoothstep(MELT_EDGE, 1, d));
    if (here > melt) melt = here;
  }

  return melt;
}

/**
 * The patches as `vec4(x, z, radius, strength)` for `ovMeltSpot`. Healed and
 * unused slots carry strength 0, which the shader's `max` ignores. `on` is
 * the draw-side effects switch: off, every slot reads as empty and the layer
 * is exactly the one it was before melting existed.
 *
 * `compact` packs the live patches at the front, in slot order, and zeroes
 * the rest, so the shader can stop at `snowMeltCount()`. Its `max` over the
 * slots is the same in any order.
 */
export function snowMeltUniform(on: boolean, compact = false): number[] {
  let n = 0;

  for (let i = 0; i < MELT_SPOTS; i++) {
    const s = spots[i];
    const k = on ? s.strength * envelope(s.age) : 0;
    const w = k > 0 ? k : 0;
    if (compact && w === 0) continue;
    const o = n++ * 4;

    uniform[o] = s.x;
    uniform[o + 1] = s.z;
    uniform[o + 2] = s.radius;
    uniform[o + 3] = w;
  }

  uniform.fill(0, n * 4);
  uniformCount = n;

  return uniform;
}

/**
 * Slots the shader has to read from the last `snowMeltUniform`: the live
 * patches when it packed them, all of them when it did not.
 */
export function snowMeltCount(): number {
  return uniformCount;
}

function update(_map: ENUM_WORLD, dt: number): void {
  for (const s of spots) {
    if (s.strength <= 0) continue;
    s.age += dt;
    if (life(s.age) <= 0) s.strength = 0;
  }
}

function reset(): void {
  for (const s of spots) {
    s.strength = 0;
    s.radius = 0;
    s.age = 0;
  }
}

// ---- 3. the layer ----------------------------------------------------------

export const snowMeltLayer: WeatherLayer = {
  name: 'snowMelt',
  // No `maps`, for the same reason `snowTrailLayer` has none: which layer the
  // patches eat, and therefore which maps they can appear on, is the
  // overlay's declaration (`melt`), not this pool's.
  update,
  reset,
};
