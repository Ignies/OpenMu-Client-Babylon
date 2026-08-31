import type { ENUM_WORLD } from '../common/types';
import type { WeatherLayer } from './layer';

/**
 * Snow melted off the ground by fire — the patch a Fire Ball, a Meteorite or
 * an Inferno leaves in a Devias snowfield.
 *
 * The original client has none of this: `snowCover.ts` already records that
 * settled snow is our own invention, and nothing in `ZzzEffect.cpp` ever
 * touches the terrain. What makes it worth having is that the snow is a
 * *simulation* — it builds while the squall blows and melts once it passes —
 * so a fireball that leaves the field untouched is the one thing on screen
 * saying the white is a texture after all.
 *
 * ### Why spots and uniforms, and not another depth map
 *
 * The ploughed trail (`snowTrail.ts`) is a 4 MB world-space map because a
 * trail is an arbitrary shape the hero draws over a whole session. A melt is
 * not: it is a handful of round patches at a time, each alive for half a
 * minute. So this keeps them as **at most `MELT_SPOTS` circles in a uniform
 * array**, the way the water reflections already carry the torch pool
 * (`ovLightPos` / `ovLightCol` in terrainOverlay.ts) — no texture, no upload,
 * no second sampler.
 *
 * That last point is the deciding one. The terrain fragment shader's sampler
 * list is brittle enough that both `terrainMaterial.ts` and
 * `terrainDynamicLight.ts` carry warnings about it — a sampler declared but
 * unbound, or two sampler types landing on one unit, is a GL draw error that
 * makes the whole terrain vanish — and on the unpacked tile path the units
 * are nearly spoken for already. A melt that costs zero of them cannot
 * provoke any of that.
 *
 * ### It imports nothing from this folder, and must not
 *
 * `terrainOverlay.ts` reads this file, and `snowCover.ts` reads
 * `terrainOverlay.ts` — so anything here that touched another weather module
 * at *module scope* would sit inside that cycle and be initialised before the
 * thing it read. Naming `SNOW_GROUND_MAPS` on the layer, which is what every
 * other snow effect does, crashed the client on load with exactly that. So
 * this file is a leaf, like `snowTrail.ts`: it owns a pool of patches and
 * knows nothing about snow. Which layer they eat — and therefore which maps
 * can show them — is `SNOW_COVER.melt`, decided at the other end.
 *
 * ### What reads it
 *
 *  - The terrain shader, through `SNOW_COVER.melt` — the spots divide the
 *    layer's *target*, so the snow's coverage, depth, relief, drift lighting
 *    and any trail ploughed through it all thin together, and the revealed
 *    ground is damped down rather than left as bare cyan tile.
 *  - `snowSink.snowUnderfoot`, on the CPU, through `snowMeltAt` — so a hero
 *    standing in a melt neither sinks into snow that is not there nor stamps
 *    a print into it. Same falloff on both sides, for the reason the bed
 *    table is shared: what you stand in has to be what you see.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * Patches alive at once.
 *
 * Eight, and that is Inferno's number: `CreateInferno` throws its bombs at
 * 45° around a 2.2-tile ring, which is wider apart than the merge below can
 * join, so anything less turns the one skill built out of eight ground hits
 * into a ring with gaps in it. The fragment loop is a `length()` and a
 * `smoothstep` per slot — a fraction of what the reflection pool's six
 * lights cost — and nearby hits merge rather than each claiming a slot, so a
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
 * not stop at a line — it thins over the last half of the circle, which is
 * what makes it read as melted rather than as a stencil.
 */
export const MELT_EDGE = 0.45;

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

/**
 * How much of a patch's life is left, 1…0 — full until the snow starts
 * closing it, then down the fill ramp to nothing.
 *
 * Separate from `envelope` because the opening ramp is not a claim on the
 * slot. Scored by the envelope, a patch made this frame is worth 0 and the
 * allocator reads it as free: a volley that lands in one frame — Inferno's
 * eight bombs, a chain of fireballs — then piles every hit into the same slot
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
  // closest to healed. Scored on `life`, never on the envelope — see there.
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

/** Whether anything is melted anywhere — the shader's "no melt" fast path. */
export function snowMeltActive(): boolean {
  for (const s of spots) if (s.strength > 0) return true;
  return false;
}

/**
 * The patches as `vec4(x, z, radius, strength)` for `ovMeltSpot`. Healed and
 * unused slots carry strength 0, which the shader's `max` ignores, so the
 * loop never needs a branch. `on` is the draw-side effects switch: off, every
 * slot reads as empty and the layer is exactly the one it was before melting
 * existed.
 */
export function snowMeltUniform(on: boolean): number[] {
  for (let i = 0; i < MELT_SPOTS; i++) {
    const s = spots[i];
    const k = on ? s.strength * envelope(s.age) : 0;
    const o = i * 4;

    uniform[o] = s.x;
    uniform[o + 1] = s.z;
    uniform[o + 2] = s.radius;
    uniform[o + 3] = k > 0 ? k : 0;
  }

  return uniform;
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
