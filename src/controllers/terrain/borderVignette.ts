import { TERRAIN_SIZE } from './consts';

/**
 * The bake's border vignette, lifted.
 *
 * Every shipped `TerrainLight` paints the outermost ring of the map near
 * black - Lorencia's ring 0 means 0.18 luma against the 0.63 the map settles
 * at ten tiles in, Noria's 0.11 against 0.63. It is not art: the original's
 * camera could not reach the border and the fade is what its draw distance
 * ended in. This client's camera can, and there the ring reads as a black
 * band hugging the coast.
 *
 * Measured off the map rather than tabled, so a map with no vignette takes
 * almost none (Devias, 0.35 against 0.45) and no map needs a constant. Pure:
 * a float buffer in and the same buffer out, so it runs in the terrain
 * worker ahead of the luminosity multiply.
 */

/** Rings whose mean is the level the map has settled to. */
const SETTLED_FROM = 24;
const SETTLED_TO = 64;

/** A ring under this share of the settled level is still inside the vignette. */
const VIGNETTE_CUT = 0.85;

/**
 * Ceiling on the lift. Lorencia's ring 0 wants 3.6x and gets 3, which leaves
 * it a little under the map - a coast reading slightly darker than the town
 * behind it is what a coast does, and an uncapped gain would turn the one
 * genuinely black corner of a map into grey mud.
 */
const MAX_GAIN = 3;

function ringOf(x: number, y: number): number {
  return Math.min(x, y, TERRAIN_SIZE - 1 - x, TERRAIN_SIZE - 1 - y);
}

/** Rec. 709 luma of one texel of the decoded bake. */
function luma(light: Float32Array, o: number): number {
  return 0.2126 * light[o] + 0.7152 * light[o + 1] + 0.0722 * light[o + 2];
}

/**
 * `light` is the decoded `TerrainLight` at 3 floats per texel, 0..1 display.
 * Rewritten in place.
 */
export function liftBorderVignette(light: Float32Array): void {
  const sums = new Float64Array(SETTLED_TO);
  const counts = new Int32Array(SETTLED_TO);

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const ring = ringOf(x, y);
      if (ring >= SETTLED_TO) continue;

      sums[ring] += luma(light, (y * TERRAIN_SIZE + x) * 3);
      counts[ring]++;
    }
  }

  const means = new Float64Array(SETTLED_TO);
  for (let r = 0; r < SETTLED_TO; r++) {
    means[r] = counts[r] > 0 ? sums[r] / counts[r] : 0;
  }

  let settled = 0;
  for (let r = SETTLED_FROM; r < SETTLED_TO; r++) settled += means[r];
  settled /= SETTLED_TO - SETTLED_FROM;

  if (settled <= 0) return;

  // The vignette's span: the outermost run of rings that never climbs back to
  // the settled level. Read from the outside in, so a dark ring further in
  // (a forest, a wall's shadow) is not mistaken for the border fade.
  let span = -1;
  for (let r = 0; r < SETTLED_FROM; r++) {
    if (means[r] >= settled * VIGNETTE_CUT) break;
    span = r;
  }

  if (span < 0) return;

  const gains = new Float64Array(span + 1);
  for (let r = 0; r <= span; r++) {
    const want = means[r] > 0 ? settled / means[r] : 1;
    gains[r] = Math.max(1, Math.min(MAX_GAIN, want));
  }

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const ring = ringOf(x, y);
      if (ring > span) continue;

      const gain = gains[ring];
      if (gain <= 1) continue;

      const o = (y * TERRAIN_SIZE + x) * 3;
      light[o] = Math.min(1, light[o] * gain);
      light[o + 1] = Math.min(1, light[o + 1] * gain);
      light[o + 2] = Math.min(1, light[o + 2] * gain);
    }
  }
}
