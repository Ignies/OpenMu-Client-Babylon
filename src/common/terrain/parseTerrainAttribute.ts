import { ENUM_WORLD } from '../types';
import { ArrayCopy, castToByte } from '../binaryUtils';
import { SIZE_OF_WORD, TERRAIN_SIZE } from './consts';
import { convertBux, decryptMapFile } from './mapFileEncryption';

export async function parseTerrainAttribute(
  file_data: Uint8Array,
  map: ENUM_WORLD
) {
  const iSize = file_data.length;

  // Decrypt file data
  const decrypted_data = new Uint8Array(iSize);
  decryptMapFile(decrypted_data, file_data, iSize);

  // Check file size
  let extAtt = false;

  if (
    iSize !== TERRAIN_SIZE * TERRAIN_SIZE + 4 &&
    iSize !== TERRAIN_SIZE * TERRAIN_SIZE * SIZE_OF_WORD + 4
  ) {
    throw new Error(`size is wrong!`);
  }

  if (iSize === TERRAIN_SIZE * TERRAIN_SIZE * SIZE_OF_WORD + 4) {
    extAtt = true;
  }

  // Extract file header
  convertBux(decrypted_data, iSize);
  const Version: Byte = decrypted_data[0];
  // const iMap: Int = decrypted_data[1];
  const Width: Byte = decrypted_data[2];
  const Height: Byte = decrypted_data[3];

  const result = new Uint16Array(TERRAIN_SIZE * TERRAIN_SIZE);

  // Extract terrain attribute data
  if (!extAtt) {
    const TWall = new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE);

    ArrayCopy(decrypted_data, 4, TWall, 0, TERRAIN_SIZE * TERRAIN_SIZE);

    for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; ++i) {
      result[i] = TWall[i];
    }
  } else {
    const dv = new DataView(decrypted_data.buffer.slice(4));

    // for (let i = 0; i < TERRAIN_SIZE; i++) {
    //   const offset = i * TERRAIN_SIZE;

    //   for (let j = 0; j < TERRAIN_SIZE; j++) {
    //     result[offset + j] = dv.getUint16(offset + j * 2, true);
    //   }
    // }

    for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
      result[i] = dv.getUint16(i * 2, true);
    }
  }

  // Check file header
  if (Version !== 0 || Width !== 255 || Height !== 255) {
    throw new Error(`Invalid header!`);
  }

  let hasError = false;

  switch (map) {
    case ENUM_WORLD.WD_0LORENCIA:
      const v = result[123 * TERRAIN_SIZE + 135];
      if (v !== 5) hasError = true;
      break;
    case ENUM_WORLD.WD_1DUNGEON:
      if (result[120 * TERRAIN_SIZE + 227] !== 4) hasError = true;
      break;
    case ENUM_WORLD.WD_2DEVIAS:
      if (result[55 * TERRAIN_SIZE + 208] !== 5) hasError = true;
      break;
    case ENUM_WORLD.WD_3NORIA:
      if (result[119 * TERRAIN_SIZE + 186] !== 5) hasError = true;
      break;
    case ENUM_WORLD.WD_4LOSTTOWER:
      if (result[75 * TERRAIN_SIZE + 193] !== 5) hasError = true;
      break;
  }

  // The original's anti-tamper probe (`OpenTerrainAttribute`): one known tile
  // per town. A mismatch means an edited or foreign `.att`, which is worth a
  // note but not a bricked client — the map still loads with what it has.
  if (hasError) {
    console.warn(
      `EncTerrain${map + 1}.att failed the attribute probe (edited or unexpected file)`
    );
  }

  //  for (let i = 0; i < TERRAIN_SIZE; i++) {
  //   const offset = i * TERRAIN_SIZE;

  //   for (let j = 0; j < TERRAIN_SIZE; j++) {
  //     result[offset + j] = result[offset + j];
  //   }
  // }

  for (let i = 0; i < TERRAIN_SIZE * TERRAIN_SIZE; i++) {
    result[i] = castToByte(result[i]);

    if (result[i] >= 128) {
      hasError = true;
    }
  }

  if (hasError) {
    throw new Error(`Another error!`);
  }

  return result;
}
