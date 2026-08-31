import { TERRAIN_SIZE } from './consts';

function _readString(buffer: DataView, from: number, to: number): string {
  let val = '';
  for (let i = from; i < to; i++) {
    const ch = String.fromCharCode(buffer.getUint8(i));

    if (ch === '\0') break;

    val += ch;
  }

  return val;
}

/**
 * `OpenTerrainHeightNew` (ZzzLodTerrain.cpp:737-790), the 24-bit variant
 * three worlds use — `IsTerrainHeightExtMap` (:599): Balgas Refuge (42),
 * Vulcanus / PK Field (63) and Doppelganger 2 (66). The file is the same
 * 4-byte tag + BITMAPFILEHEADER (14) + BITMAPINFOHEADER (40), but the pixels
 * are 24-bit BGR with no palette, and each pixel is one 24-bit integer read
 * *reversed* (`pbyHeight[0] = src[2]`) plus `g_fMinHeight = -500`. No 1.5
 * factor on this path. Detected by size: 196666 bytes against the 8-bit
 * file's 66620.
 */
const EXT_PIXELS_OFFSET = 4 + 14 + 40;
const EXT_MIN_HEIGHT = -500;

export async function parseTerrainHeight(buffer: Uint8Array) {
  const result = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE);

  if (buffer.length >= EXT_PIXELS_OFFSET + TERRAIN_SIZE * TERRAIN_SIZE * 3) {
    for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
      const at = EXT_PIXELS_OFFSET + i * 3;
      const height =
        buffer[at + 2] | (buffer[at + 1] << 8) | (buffer[at] << 16);
      result[i] = (height + EXT_MIN_HEIGHT) / 100;
    }
    return result;
  }

  const Index = 1084;
  const factor = 1.5 / 100;

  for (let y = 0; y < TERRAIN_SIZE; y++) {
    for (let x = 0; x < TERRAIN_SIZE; x++) {
      result[y * TERRAIN_SIZE + x] =
        buffer[Index + y * TERRAIN_SIZE + x] * factor;
    }
  }

  return result;
}
