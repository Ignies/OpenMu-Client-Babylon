import {
  Constants,
  RawTexture2DArray,
  Texture,
  type Scene,
} from '../render/babylon/exports';
import { onGameOptionsChanged } from '../../modules/options/gameOptions';
import { textureFiltering } from '../render/materialQuality';
import { packLayers, type TilePixels } from './tilePack';
import { decodeJpegPixels } from './terrainJpeg';
import { packTilesOffThread } from './terrainParseClient';

/**
 * Packs a map's tile textures into one `sampler2DArray` (two fetches per pixel instead of a guarded
 * chain). Small tiles upscale nearest on Classic, bilinear on tiers >= 1. See readme.md.
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

  const tiles = await Promise.all(jpegs.map(jpeg => decodeJpegPixels(jpeg)));

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
  // Resampled in the terrain worker: on the main thread this was 200-300 ms
  // of a map load, in the frames that already carry the rest of it.
  const data = await packTilesOffThread(tiles, size, linear);

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
    // Rows are top-down, which is the orientation the per-tile fallback
    // `Texture`s are uploaded with (invertY false in createOZJTexture).
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
