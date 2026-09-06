import {
  Constants,
  RawTexture2DArray,
  Texture,
  type Scene,
} from '../babylon/exports';
import { onGameOptionsChanged } from '../../common/gameOptions';
import { textureFiltering } from '../../common/materialQuality';

/**
 * Packs a map's tile textures into one `sampler2DArray`.
 *
 * The splat shader used to be generated as a chain of
 * `if (m1 >= i && m1 < i+0.5) { texture2D(textures[i], …) }` over every tile
 * texture — twice, once for the opaque layer and once for the alpha layer. A
 * GLSL sampler array cannot be indexed by a value that varies per fragment,
 * which is why it was written that way; with a 2D array the layer *is* just a
 * coordinate, so 18-20 conditional fetches per pixel of a full-screen,
 * never-culled mesh collapse into two.
 *
 * Tiles come in mixed sizes (256² and 128² in the shipped worlds), so the
 * smaller ones are upscaled to the largest. The upscale follows the sampler:
 * Classic samples `NEAREST_NEAREST` with no mip chain, which is what the
 * original does, and an integer nearest upscale is exact under it - the same
 * texel is fetched either way. Tiers >= 1 filter trilinear with anisotropy
 * (`textureFiltering`), and there the upscale is bilinear: a nearest 2x
 * upscale leaves 2x2 plateaus that the linear sampler ramps between, so a
 * magnified 128² tile still read as soft-edged blocks.
 *
 * The mip chain is built either way. It is a third of the array's memory and
 * nothing samples it in Classic, but having it there is what lets the sampler
 * flip be a live `updateSamplingMode` call. The blit flip is one `update` of
 * the array from the decoded tiles kept beside it, not a map reload.
 *
 * Per-layer filtering is safe on a `sampler2DArray`: layers are independent
 * for filtering and mip generation, so no tile can bleed into its neighbour
 * in the array the way it would in an atlas.
 */

type LiveArray = {
  texture: RawTexture2DArray;
  tiles: TilePixels[];
  size: number;
  /** Whether the layers were packed with the bilinear upscale. */
  linear: boolean;
};

/** Every live tile array, so a quality flip can re-resolve all of them. */
const liveArrays = new Map<RawTexture2DArray, LiveArray>();

function syncTileFiltering(): void {
  const { sampling, anisotropy } = textureFiltering();
  const linear = sampling !== Texture.NEAREST_NEAREST;

  for (const live of liveArrays.values()) {
    live.texture.updateSamplingMode(sampling);
    live.texture.anisotropicFilteringLevel = anisotropy;

    if (live.linear !== linear) {
      live.linear = linear;
      live.texture.update(packLayers(live.tiles, live.size, linear));
    }
  }
}

onGameOptionsChanged(syncTileFiltering);

export type TileTextureArray = {
  readonly texture: RawTexture2DArray;
  /** Per-layer UV multiplier, in the layer order handed to `createTileTextureArray`. */
  readonly scales: Float32Array;
  readonly layers: number;
};

/** Decoded RGBA of one tile, top row first. */
type TilePixels = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

/**
 * Decodes a JPEG to top-down RGBA. Deliberately not `Texture.readPixels()`:
 * that reads back from the GPU bottom-up, and a silently vertically flipped
 * noise tile is exactly the kind of mistake that survives review.
 */
async function decodeJpeg(bytes: Uint8Array): Promise<TilePixels> {
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  const bitmap = await createImageBitmap(blob);
  // A closed ImageBitmap reports 0 x 0, so the size is taken first.
  const { width, height } = bitmap;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0);

  const image = context.getImageData(0, 0, width, height);

  bitmap.close();

  return { data: image.data, width, height };
}

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

function packLayers(
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

/**
 * `scale` mirrors what `getTerrainData` computed per texture: a 256² tile
 * repeats every 64 terrain tiles, everything else every `size` of them. It
 * has to stay keyed on the tile's *own* size, not the array's, so upscaling
 * a 128² tile does not change how often it repeats.
 */
function uvScaleFor(size: number): number {
  return size === 256 ? size / 4 : size;
}

export async function createTileTextureArray(
  scene: Scene,
  jpegs: readonly Uint8Array[]
): Promise<TileTextureArray | null> {
  if (jpegs.length === 0) return null;

  // `sampler2DArray` is WebGL2 only; WebGL1 keeps the per-tile sampler chain.
  const engine = scene.getEngine() as { webGLVersion?: number };
  if ((engine.webGLVersion ?? 2) < 2) return null;

  const tiles = await Promise.all(jpegs.map(decodeJpeg));

  let size = 0;
  for (const tile of tiles) size = Math.max(size, tile.width, tile.height);

  if (size === 0) return null;

  const layers = tiles.length;
  const scales = new Float32Array(layers);

  for (let layer = 0; layer < layers; layer++) {
    scales[layer] = uvScaleFor(tiles[layer].height);
  }

  const { sampling, anisotropy } = textureFiltering();
  const linear = sampling !== Texture.NEAREST_NEAREST;
  const data = packLayers(tiles, size, linear);

  const texture = new RawTexture2DArray(
    data,
    size,
    size,
    layers,
    Constants.TEXTUREFORMAT_RGBA,
    scene,
    // generateMipMaps: built in both modes so the Classic/Enhanced flip is a
    // sampling-mode change rather than a map reload.
    true,
    // Rows are top-down, which is the orientation the individual `Texture`s
    // were uploaded with (invertY false in readOJZBufferAsJPEGBuffer).
    false,
    sampling
  );

  texture.name = 'terrainTileArray';
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = anisotropy;

  // A map change disposes the old array; without this the map would pin it
  // and the next quality flip would touch a dead texture.
  liveArrays.set(texture, { texture, tiles, size, linear });
  texture.onDisposeObservable.add(() => liveArrays.delete(texture));

  return { texture, scales, layers };
}

/** Diagnostics: the live terrain tile arrays, for `window.muMat()`. */
export function liveTileArrays(): RawTexture2DArray[] {
  return [...liveArrays.keys()];
}
