import { Vector3 } from '../babylon/exports';
import { TERRAIN_SIZE } from '../../common/terrain/consts';

/**
 * Expands the packed baked light (3 floats per texel) into the per-texel
 * vectors the ground builder and the light sampler index.
 *
 * These have to be real `Vector3` instances, not plain `{x, y, z}` objects,
 * even though every signature involved is typed `IVector3Like`:
 * `CreateGroundFromHeightMap` copies each entry with `Vector3.copyFrom`
 * (customGroundMesh.ts:51), and Babylon's `copyFrom` reads the *private*
 * backing fields — `source._x`, not `source.x` (math.vector.js:1753). Handing
 * it a plain object silently writes `undefined` into every terrain vertex
 * colour: no error, no exception, just flat unlit ground.
 *
 * Deliberately a separate module from `parseTerrainLight`: that one stays
 * free of Babylon so the terrain worker can import it without pulling the
 * engine into its chunk (todo C8).
 */
export function unpackTerrainLight(packed: Float32Array): Vector3[] {
  const out = new Array<Vector3>(TERRAIN_SIZE * TERRAIN_SIZE);

  for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
    const o = i * 3;
    out[i] = new Vector3(packed[o], packed[o + 1], packed[o + 2]);
  }

  return out;
}
