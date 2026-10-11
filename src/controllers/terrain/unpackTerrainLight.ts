import { Vector3 } from '../render/babylon/exports';
import { TERRAIN_SIZE } from './consts';

/**
 * Expands the packed baked light into real `Vector3`s (Babylon's `copyFrom` reads private `_x`,
 * math.vector.js:1753). A separate module so `parseTerrainLight` stays Babylon-free for the worker.
 */
export function unpackTerrainLight(packed: Float32Array): Vector3[] {
  const out = new Array<Vector3>(TERRAIN_SIZE * TERRAIN_SIZE);

  for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
    const o = i * 3;
    out[i] = new Vector3(packed[o], packed[o + 1], packed[o + 2]);
  }

  return out;
}
