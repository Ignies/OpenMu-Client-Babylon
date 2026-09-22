/**
 * Resampling a map's tiles into the layers of one `sampler2DArray`, with no
 * Babylon import so the terrain worker can run it.
 */

/** Decoded RGBA of one tile, top row first. */
export type TilePixels = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

/** Nearest-neighbour resample of RGBA into a `size × size` block of `out`. */
function blitNearest(
  tile: TilePixels,
  out: Uint8Array,
  layer: number,
  size: number
): void {
  const base = layer * size * size * 4;

  for (let y = 0; y < size; y++) {
    const sy = ((y * tile.height) / size) | 0;
    const sourceRow = sy * tile.width * 4;
    const targetRow = base + y * size * 4;

    for (let x = 0; x < size; x++) {
      const sx = ((x * tile.width) / size) | 0;
      const s = sourceRow + sx * 4;
      const t = targetRow + x * 4;

      out[t] = tile.data[s];
      out[t + 1] = tile.data[s + 1];
      out[t + 2] = tile.data[s + 2];
      out[t + 3] = tile.data[s + 3];
    }
  }
}

/**
 * Bilinear resample of RGBA into a `size × size` block of `out`, sampling at
 * texel centres and wrapping at the edges (the tiles repeat). A tile already
 * at `size` copies through unchanged.
 */
function blitLinear(
  tile: TilePixels,
  out: Uint8Array,
  layer: number,
  size: number
): void {
  const base = layer * size * size * 4;
  const { width, height, data } = tile;

  for (let y = 0; y < size; y++) {
    const sy = ((y + 0.5) * height) / size - 0.5;
    const y0 = Math.floor(sy);
    const fy = sy - y0;
    const row0 = (((y0 % height) + height) % height) * width * 4;
    const row1 = ((((y0 + 1) % height) + height) % height) * width * 4;
    const targetRow = base + y * size * 4;

    for (let x = 0; x < size; x++) {
      const sx = ((x + 0.5) * width) / size - 0.5;
      const x0 = Math.floor(sx);
      const fx = sx - x0;
      const c0 = (((x0 % width) + width) % width) * 4;
      const c1 = ((((x0 + 1) % width) + width) % width) * 4;
      const t = targetRow + x * 4;

      for (let c = 0; c < 4; c++) {
        const top = data[row0 + c0 + c] * (1 - fx) + data[row0 + c1 + c] * fx;
        const bottom =
          data[row1 + c0 + c] * (1 - fx) + data[row1 + c1 + c] * fx;
        out[t + c] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
}

/** Every tile resampled to `size × size`, one layer each, in the tiles' order. */
export function packLayers(
  tiles: readonly TilePixels[],
  size: number,
  linear: boolean
): Uint8Array {
  const data = new Uint8Array(size * size * 4 * tiles.length);
  const blit = linear ? blitLinear : blitNearest;

  for (let layer = 0; layer < tiles.length; layer++) {
    blit(tiles[layer], data, layer, size);
  }

  return data;
}
