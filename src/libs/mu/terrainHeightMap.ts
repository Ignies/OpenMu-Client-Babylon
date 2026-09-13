import { RawTexture, Texture, type Scene } from '../babylon/exports';
import { setPrecipiceMask } from '../../scenes/heightFog';
import { TERRAIN_SIZE } from '../../common/terrain/consts';

export const TERRAIN_HEIGHT_SCALE = (1.5 / 100) * 255;

let heightMap: Texture | null = null;

export function updateTerrainHeightMap(
  scene: Scene,
  heights: Float32Array
): Texture {
  heightMap?.dispose();

  const pixels = new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE * 4);

  for (let i = 0; i < heights.length; i++) {
    const raw = Math.round((heights[i] / TERRAIN_HEIGHT_SCALE) * 255);
    const byte = raw < 0 ? 0 : raw > 255 ? 255 : raw;

    pixels[i * 4] = byte;
    pixels[i * 4 + 3] = 255;
  }

  heightMap = RawTexture.CreateRGBATexture(
    pixels,
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    scene,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE
  );

  heightMap.name = 'terrainHeightMap';
  heightMap.wrapU = Texture.CLAMP_ADDRESSMODE;
  heightMap.wrapV = Texture.CLAMP_ADDRESSMODE;

  return heightMap;
}

export function getTerrainHeightMap(): Texture | null {
  return heightMap;
}

/**
 * The precipice fade on the GPU (`common/terrain/precipice.ts`): one byte a
 * tile in red, 255 where the map has ground. Lives here rather than in
 * `precipice.ts` because that file is pure and runs where the terrain is
 * prepared; this is the one Babylon-side copy of it, and it is owned the
 * same way the height map above is - one texture, replaced per map load.
 */
let precipiceMap: Texture | null = null;

export function updatePrecipiceMask(
  scene: Scene,
  bytes: Uint8Array | null
): void {
  precipiceMap?.dispose();
  precipiceMap = null;

  if (bytes) {
    precipiceMap = RawTexture.CreateRGBATexture(
      bytes,
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      scene,
      false,
      false,
      Texture.BILINEAR_SAMPLINGMODE
    );

    precipiceMap.name = 'terrainPrecipiceMask';
    precipiceMap.wrapU = Texture.CLAMP_ADDRESSMODE;
    precipiceMap.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  setPrecipiceMask(precipiceMap);
}
