import { TERRAIN_SIZE } from './consts';
import { createTerrainNormal } from './createTerrainNormal';
import { TERRAIN_INDEX } from './utils';

/** Direction the bake is lit from. The original's non-Battle-Castle value. */
const LIGHT_X = 0.5;
const LIGHT_Y = -0.5;
const LIGHT_Z = 0.5;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * The baked terrain light, packed as 3 floats per texel.
 *
 * Pure: no Babylon, no DOM, typed arrays in and out — so it runs in the
 * terrain worker (todo C8) and the result transfers instead of cloning.
 * `lightBuffer` is the decoded TerrainLight.OZJ (3 floats per texel), which
 * still has to be produced on the main thread because the JPEG decode goes
 * through the engine.
 */
export function parseTerrainLightPacked(
  lightBuffer: Float32Array,
  heightData: Float32Array
): Float32Array {
  const normals = createTerrainNormal(heightData);
  const result = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE * 3);

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const i = TERRAIN_INDEX(x, y);
      const o = i * 3;

      // Dot(normal, light) + 0.5, clamped — the original's Luminosity.
      const luminosity = clamp01(
        normals[o] * LIGHT_X +
          normals[o + 1] * LIGHT_Y +
          normals[o + 2] * LIGHT_Z +
          0.5
      );

      // The lightmap sample is clamped to [0,1] per channel first, then
      // scaled by the luminosity.
      result[o] = clamp01(lightBuffer[o]) * luminosity;
      result[o + 1] = clamp01(lightBuffer[o + 1]) * luminosity;
      result[o + 2] = clamp01(lightBuffer[o + 2]) * luminosity;
    }
  }

  return result;
}
