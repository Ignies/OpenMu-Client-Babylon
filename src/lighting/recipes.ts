import type { LightRecipe } from './lightSource';

/**
 * Pure data shared by the entries: the element palette every skill,
 * character and effect table is built from. Each preset takes a terrain
 * range in tiles and a life in seconds and returns a `LightRecipe`; an entry
 * overrides fields with a spread where it needs to.
 *
 * Colours are linear RGB following the effect's own sprite tint in the
 * original (BITMAP_FIRE is orange, BITMAP_LIGHTNING blue-white, BITMAP_ICE
 * pale blue, MODEL_POISON green).
 */

/** Orange fire — flame columns, fire balls, hellfire. Rolls like a torch. */
export const flame = (
  range: number,
  seconds: number,
  extra?: Partial<LightRecipe>
): LightRecipe => ({
  color: [1, 0.55, 0.25],
  range,
  seconds,
  flicker: { min: 0.7, max: 1, steps: 4 },
  ...extra,
});

/** Deep red-orange — embers in flight, meteor cores. */
export const ember = (range: number, seconds: number): LightRecipe => ({
  color: [1, 0.35, 0.1],
  range,
  seconds,
  flicker: { min: 0.6, max: 1, steps: 5 },
});

/** Blue-white electricity — strikes, sparks. Long tail: the afterimage. */
export const arc = (
  range: number,
  seconds: number,
  extra?: Partial<LightRecipe>
): LightRecipe => ({
  color: [0.55, 0.7, 1],
  range,
  seconds,
  flicker: { min: 0.5, max: 1, steps: 3 },
  release: seconds * 0.7,
  ...extra,
});

/** Pale ice blue, steady. */
export const frost = (range: number, seconds: number): LightRecipe => ({
  color: [0.5, 0.8, 1],
  range,
  seconds,
});

/** Sickly green, slow pulse. */
export const venom = (range: number, seconds: number): LightRecipe => ({
  color: [0.35, 1, 0.45],
  range,
  seconds,
  pulse: { speed: 0.012, amount: 0.15, base: 0.8 },
});

/** Water blue, steady. */
export const tide = (range: number, seconds: number): LightRecipe => ({
  color: [0.3, 0.7, 1],
  range,
  seconds,
});

/** Violet — dark magic. */
export const shade = (range: number, seconds: number): LightRecipe => ({
  color: [0.7, 0.4, 1],
  range,
  seconds,
});

/** Warm white — heals and buffs; a short attack so it blooms rather than pops. */
export const holy = (range: number, seconds: number): LightRecipe => ({
  color: [1, 0.95, 0.75],
  range,
  seconds,
  attack: 0.08,
});

/** Pure white — energy, slashes. Long tail. */
export const spark = (range: number, seconds: number): LightRecipe => ({
  color: [1, 1, 1],
  range,
  seconds,
  release: seconds * 0.8,
});
