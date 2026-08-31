import {
  Constants,
  RawTexture2DArray,
  Texture,
  type Scene,
} from '../babylon/exports';
import { onGameOptionsChanged } from '../../common/gameOptions';
import {
  materialQuality,
  pbrDetailStrength,
} from '../../common/materialQuality';

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
 * smaller ones are nearest-upscaled to the largest. An integer nearest
 * upscale is exact under nearest sampling — the same texel is fetched either
 * way — which is why the blit is nearest even on Enhanced.
 *
 * **Filtering is quality-gated** ('terrain tile seams'). Classic
 * samples `NEAREST_NEAREST` with no mip chain, which is what the original
 * does and what every mood was graded against. Enhanced turns on trilinear
 * plus anisotropy, which is a *visible deviation*: it kills the shimmer the
 * tile grid throws at grazing angles, and it costs the crisp per-texel look
 * up close.
 *
 * The mip chain is built either way. It is a third of the array's memory and
 * nothing samples it in Classic, but having it there is what lets the two
 * modes be a live `updateSamplingMode` call instead of a map reload.
 *
 * Per-layer filtering is safe on a `sampler2DArray`: layers are independent
 * for filtering and mip generation, so no tile can bleed into its neighbour
 * in the array the way it would in an atlas.
 */

/** Anisotropy on Enhanced; 1 (off) on Classic. Capped by the engine. */
const ENHANCED_ANISOTROPY = 8;

function tileFiltering(): { sampling: number; anisotropy: number } {
  // Two gates, both of which have to open.
  //
  // The tier gate: mipping the ground is not a character, so the Characters
  // tier leaves it alone.
  //
  // The detail gate: at this camera height a mip chain over a 128² MU tile
  // averages the grain out of it, and an averaged tile is a lighter, flatter,
  // lower-contrast tile. The ground is most of the screen, so this is the
  // largest single "the texture itself went pale" in the whole Enhanced tier —
  // larger than anything the derived maps do — and it belongs on the same dial
  // as the rest of the deviation rather than being welded to the tier.
  const strength = materialQuality() >= 2 ? pbrDetailStrength() : 0;

  if (strength <= 0) return { sampling: Texture.NEAREST_NEAREST, anisotropy: 1 };

  return {
    sampling: Texture.TRILINEAR_SAMPLINGMODE,
    anisotropy: Math.max(1, Math.round(strength * ENHANCED_ANISOTROPY)),
  };
}

/** Every live tile array, so a quality flip can re-resolve all of them. */
const liveArrays = new Set<RawTexture2DArray>();

function syncTileFiltering(): void {
  const { sampling, anisotropy } = tileFiltering();

  for (const texture of liveArrays) {
    texture.updateSamplingMode(sampling);
    texture.anisotropicFilteringLevel = anisotropy;
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

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0);

  const image = context.getImageData(0, 0, bitmap.width, bitmap.height);

  bitmap.close();

  return { data: image.data, width: bitmap.width, height: bitmap.height };
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
  const data = new Uint8Array(size * size * 4 * layers);
  const scales = new Float32Array(layers);

  for (let layer = 0; layer < layers; layer++) {
    blitNearest(tiles[layer], data, layer, size);
    scales[layer] = uvScaleFor(tiles[layer].height);
  }

  const { sampling, anisotropy } = tileFiltering();

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

  // A map change disposes the old array; without this the set would pin it
  // and the next quality flip would touch a dead texture.
  liveArrays.add(texture);
  texture.onDisposeObservable.add(() => liveArrays.delete(texture));

  return { texture, scales, layers };
}

/** Diagnostics: the live terrain tile arrays, for `window.muMat()`. */
export function liveTileArrays(): RawTexture2DArray[] {
  return [...liveArrays];
}
