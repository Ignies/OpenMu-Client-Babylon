import { TERRAIN_SCALE, TERRAIN_SIZE } from './consts';
import { TERRAIN_INDEX, TERRAIN_INDEX_REPEAT } from './utils';

/**
 * Per-texel terrain normals, 3 floats per texel: the original routine on plain floats so it runs
 * in the worker. Keeps the original's carried `face_normal` scratch (`fnx/fny/fnz`). See readme.md.
 */
export function createTerrainNormal(heightBuffer: Float32Array): Float32Array {
  const result = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE * 3);

  let fnx = 0;
  let fny = 0;
  let fnz = 0;

  /** Cross product of (b-a)×(c-a), normalised, into the carried scratch. */
  const faceNormalize = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number
  ) => {
    const nx = (by - ay) * (cz - az) - (cy - ay) * (bz - az);
    const ny = (bz - az) * (cx - ax) - (cz - az) * (bx - ax);
    const nz = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);

    const dot = Math.sqrt(nx * nx + ny * ny + nz * nz);

    if (dot === 0) return; // carries the previous face's normal, as the original does

    fnx = nx / dot;
    fny = ny / dot;
    fnz = nz / dot;
  };

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const o = TERRAIN_INDEX(x, y) * 3;

      // The quad whose lower-left corner is (x, y). The original built these
      // as Vector3(x * SCALE, y * SCALE, height) - z is the height axis here.
      const v4x = x * TERRAIN_SCALE;
      const v4y = y * TERRAIN_SCALE;
      const v4z = heightBuffer[TERRAIN_INDEX_REPEAT(x, y)];

      const v1x = (x + 1) * TERRAIN_SCALE;
      const v1y = y * TERRAIN_SCALE;
      const v1z = heightBuffer[TERRAIN_INDEX_REPEAT(x + 1, y)];

      const v2x = (x + 1) * TERRAIN_SCALE;
      const v2y = (y + 1) * TERRAIN_SCALE;
      const v2z = heightBuffer[TERRAIN_INDEX_REPEAT(x + 1, y + 1)];

      const v3x = x * TERRAIN_SCALE;
      const v3y = (y + 1) * TERRAIN_SCALE;
      const v3z = heightBuffer[TERRAIN_INDEX_REPEAT(x, y + 1)];

      let nx = 0;
      let ny = 0;
      let nz = 0;

      faceNormalize(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
      nx += fnx;
      ny += fny;
      nz += fnz;

      faceNormalize(v3x, v3y, v3z, v4x, v4y, v4z, v1x, v1y, v1z);
      nx += fnx;
      ny += fny;
      nz += fnz;

      result[o] = nx;
      result[o + 1] = ny;
      result[o + 2] = nz;
    }
  }

  return result;
}
