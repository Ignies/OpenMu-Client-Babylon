import { TERRAIN_SIZE, TWFlags } from './consts';
import { TERRAIN_INDEX } from './utils';

/** A quad per tile; `textures` goes up as `uvs2`, `alphaColors` as `matricesWeights`. */
export type GroundArrays = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  textures: Float32Array;
  colors: Float32Array;
  alphaColors: Float32Array;
  indices: Uint32Array;
};

/** Where a `NoGround` tile's corners go: far enough down to never be seen. */
const NO_GROUND_HEIGHT = -10000;

function clamp(n: number): number {
  return n >= TERRAIN_SIZE ? TERRAIN_SIZE - 1 : n;
}

function terrainIndex(x: number, y: number): number {
  return TERRAIN_INDEX(clamp(x), clamp(y));
}

/**
 * The ground's vertex arrays, with no Babylon import so the terrain worker can
 * build them. The light is folded as `ambient + light * (1 - ambient)`.
 */
export function buildGroundArrays(
  height: Float32Array,
  flags: Uint16Array,
  layer1: Uint8Array,
  layer2: Uint8Array,
  alpha: Uint8Array,
  lightPacked: Float32Array,
  ambient: number
): GroundArrays {
  const tiles = TERRAIN_SIZE * TERRAIN_SIZE;
  const vertices = tiles * 4;

  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const uvs = new Float32Array(vertices * 2);
  const textures = new Float32Array(vertices * 2);
  const colors = new Float32Array(vertices * 4);
  const alphaColors = new Float32Array(vertices * 4);
  const indices = new Uint32Array(tiles * 6);

  const lightCount = lightPacked.length / 3;
  const keep = 1 - ambient;

  // Scaled in doubles before the float32 store, so it rounds once as before.
  const light = (
    index: number,
    out: Float32Array,
    o: number,
    scale: number,
    a: number
  ) => {
    const l = index * 3;
    const r = index < lightCount ? lightPacked[l] : 0;
    const g = index < lightCount ? lightPacked[l + 1] : 0;
    const b = index < lightCount ? lightPacked[l + 2] : 0;

    out[o] = (ambient + r * keep) * scale;
    out[o + 1] = (ambient + g * keep) * scale;
    out[o + 2] = (ambient + b * keep) * scale;
    out[o + 3] = a;
  };

  let v = 0;
  let i = 0;

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      const idx1 = terrainIndex(x, y);
      const idx2 = terrainIndex(x + 1, y);
      const idx3 = terrainIndex(x + 1, y + 1);
      const idx4 = terrainIndex(x, y + 1);

      const noGround =
        (flags[idx1] & TWFlags.NoGround) === TWFlags.NoGround;

      const p = v * 3;
      positions[p] = x;
      positions[p + 1] = noGround ? NO_GROUND_HEIGHT : height[idx1];
      positions[p + 2] = y;
      positions[p + 3] = x + 1;
      positions[p + 4] = noGround ? NO_GROUND_HEIGHT : height[idx2];
      positions[p + 5] = y;
      positions[p + 6] = x + 1;
      positions[p + 7] = noGround ? NO_GROUND_HEIGHT : height[idx3];
      positions[p + 8] = y + 1;
      positions[p + 9] = x;
      positions[p + 10] = noGround ? NO_GROUND_HEIGHT : height[idx4];
      positions[p + 11] = y + 1;

      const a1 = idx1 < alpha.length ? alpha[idx1] : 0;
      const a2 = idx2 < alpha.length ? alpha[idx2] : 0;
      const a3 = idx3 < alpha.length ? alpha[idx3] : 0;
      const a4 = idx4 < alpha.length ? alpha[idx4] : 0;

      const isOpaque = (a1 & a2 & a3 & a4) === 255;
      const hasAlpha = (a1 | a2 | a3 | a4) !== 0;
      // The alpha layer's light is scaled by its coverage; a tile without
      // one keeps the light whole at alpha 0.
      const covered = !isOpaque && hasAlpha;
      const c1 = covered ? a1 / 255 : 1;
      const c2 = covered ? a2 / 255 : 1;
      const c3 = covered ? a3 / 255 : 1;
      const c4 = covered ? a4 / 255 : 1;

      const c = v * 4;
      light(idx1, colors, c, 1, 1);
      light(idx2, colors, c + 4, 1, 1);
      light(idx3, colors, c + 8, 1, 1);
      light(idx4, colors, c + 12, 1, 1);
      light(idx1, alphaColors, c, c1, covered ? c1 : 0);
      light(idx2, alphaColors, c + 4, c2, covered ? c2 : 0);
      light(idx3, alphaColors, c + 8, c3, covered ? c3 : 0);
      light(idx4, alphaColors, c + 12, c4, covered ? c4 : 0);

      const u = v * 2;
      uvs[u] = x / TERRAIN_SIZE;
      uvs[u + 1] = y / TERRAIN_SIZE;
      uvs[u + 2] = (x + 1) / TERRAIN_SIZE;
      uvs[u + 3] = y / TERRAIN_SIZE;
      uvs[u + 4] = (x + 1) / TERRAIN_SIZE;
      uvs[u + 5] = (y + 1) / TERRAIN_SIZE;
      uvs[u + 6] = x / TERRAIN_SIZE;
      uvs[u + 7] = (y + 1) / TERRAIN_SIZE;

      const opaqueTexture = isOpaque ? layer2[idx1] : layer1[idx1];
      const alphaTexture = covered ? layer2[idx1] : -1;

      for (let k = 0; k < 8; k += 2) {
        textures[u + k] = opaqueTexture;
        textures[u + k + 1] = alphaTexture;
      }

      indices[i++] = v;
      indices[i++] = v + 1;
      indices[i++] = v + 2;
      indices[i++] = v + 3;
      indices[i++] = v;
      indices[i++] = v + 2;

      v += 4;
    }
  }

  computeNormals(positions, indices, normals);

  return { positions, normals, uvs, textures, colors, alphaColors, indices };
}

/** Babylon's `VertexData.ComputeNormals` with no options, without the engine. */
export function computeNormals(
  positions: Float32Array,
  indices: Uint32Array,
  normals: Float32Array
): void {
  // Summed in doubles as Babylon does, so it rounds to float once.
  const sums = new Float64Array(normals.length);

  const faces = (indices.length / 3) | 0;

  for (let f = 0; f < faces; f++) {
    const v1 = indices[f * 3] * 3;
    const v2 = indices[f * 3 + 1] * 3;
    const v3 = indices[f * 3 + 2] * 3;

    const p1p2x = positions[v1] - positions[v2];
    const p1p2y = positions[v1 + 1] - positions[v2 + 1];
    const p1p2z = positions[v1 + 2] - positions[v2 + 2];
    const p3p2x = positions[v3] - positions[v2];
    const p3p2y = positions[v3 + 1] - positions[v2 + 1];
    const p3p2z = positions[v3 + 2] - positions[v2 + 2];

    let nx = p1p2y * p3p2z - p1p2z * p3p2y;
    let ny = p1p2z * p3p2x - p1p2x * p3p2z;
    let nz = p1p2x * p3p2y - p1p2y * p3p2x;

    let length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    length = length === 0 ? 1 : length;
    nx /= length;
    ny /= length;
    nz /= length;

    sums[v1] += nx;
    sums[v1 + 1] += ny;
    sums[v1 + 2] += nz;
    sums[v2] += nx;
    sums[v2 + 1] += ny;
    sums[v2 + 2] += nz;
    sums[v3] += nx;
    sums[v3 + 1] += ny;
    sums[v3 + 2] += nz;
  }

  for (let n = 0; n < normals.length; n += 3) {
    const x = sums[n];
    const y = sums[n + 1];
    const z = sums[n + 2];

    let length = Math.sqrt(x * x + y * y + z * z);
    length = length === 0 ? 1 : length;

    normals[n] = x / length;
    normals[n + 1] = y / length;
    normals[n + 2] = z / length;
  }
}
