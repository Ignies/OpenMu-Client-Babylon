import { type Scene, Texture } from '../libs/babylon/exports';
import { resolveUrlToDataFolder } from './resolveUrlToDataFolder';

// Moved to a Babylon-free module so the terrain worker can import them
// without dragging this file's `Scene`/`Texture` imports along (todo C8).
export {
  castToByte,
  ArrayCopy,
  GetByteValue,
  SetByteValue,
  GetBoolean,
  SetBoolean,
} from './binaryUtils';

// Same split, for the protocol layer: packet framing and the numeric casts
// are imported by the proxy, which runs under Bun with no engine at all.
export {
  byteToString,
  getSizeOfPacketType,
  getPacketHeaderSize,
  getPacketSize,
  setPacketSize,
  stringToBytes,
  castToUInt,
  castToUShort,
  integerDevision,
} from './wireUtils';

// More permormance
// export function SetBoolean(oldValue: Byte, value: Boolean): Byte {
//   const clearMask = 0b1111_1110;
//   oldValue &= clearMask;
//   if (value) {
//     oldValue |= 1;
//   }
//   return oldValue;
// }


export async function downloadBytesBuffer(url: string) {
  const req = await fetch(url);
  // vite's SPA fallback answers a missing path with index.html and HTTP 200;
  // a BMD / OZJ / GLB reader then decodes HTML into plausible-looking garbage
  // (the master tree once showed groups 134-255 that way). Fail loudly instead.
  const type = req.headers.get('content-type') ?? '';
  if (!req.ok || type.startsWith('text/html')) {
    throw new Error(
      `Data file not found: ${url} (HTTP ${req.status}, ${type || 'no content-type'})`
    );
  }
  const ab = await req.arrayBuffer();
  const buffer = new Uint8Array(ab);

  return buffer;
}

export async function downloadDataBytesBuffer(url: string) {
  return downloadBytesBuffer(resolveUrlToDataFolder(url));
}

/**
 * A GPU texture from an OZJ (a JPEG behind a 24-byte header) and nothing
 * else: the browser decodes the JPEG, no `readPixels` round trip. The terrain
 * tiles go through here; `readOJZBufferAsJPEGBuffer` below is for the one
 * caller (the terrain light map) that needs the pixels back on the CPU.
 */
export function createOZJTexture(
  scene: Scene,
  filename: string,
  ozjBuffer: Uint8Array
): Promise<Texture> {
  if (ozjBuffer.length < 24) {
    throw new Error(`The file ${filename} is too small to be as a OZJ`);
  }

  const fName = filename.split('/').at(-1)?.split('.')[0];
  const tName = filename.split('/').slice(0, -1).join('_') + '-' + fName;

  return new Promise<Texture>((resolve, reject) => {
    const texture = new Texture(
      `data:${tName}.jpg`,
      scene.getEngine()!,
      true,
      false,
      Texture.NEAREST_NEAREST,
      () => resolve(texture),
      (message, exception) =>
        reject(
          exception ?? new Error(message ?? `Could not decode ${filename}`)
        ),
      ozjBuffer.slice(24),
      true
    );
    texture.anisotropicFilteringLevel = 1;
    texture.isBlocking = false;
    texture.name = tName;
  });
}

// TODO we only need bytes buffer? Try to omit bjs dependency...
export async function readOJZBufferAsJPEGBuffer(
  scene: Scene,
  filename: string,
  ozjBuffer: Uint8Array
) {
  const fileSize = ozjBuffer.length;
  if (fileSize < 24) {
    throw new Error(`The file ${filename} is too small to be as a OZJ`);
  }

  // Skip first 24 bytes, because these are added by the OZJ format
  // const jpegSize = fileSize - 24;

  // let jpegSubsamp = TJSAMP_444;
  // let jpegColorspace = TJCS_RGB;

  filename.split('/').slice(0, -1).join('_');
  const fName = filename.split('/').at(-1)?.split('.')[0];
  const tName = filename.split('/').slice(0, -1).join('_') + '-' + fName;

  const texture = new Texture(
    `data:${tName}.jpg`,
    scene.getEngine()!,
    true,
    false,
    Texture.NEAREST_NEAREST,
    null,
    null,
    ozjBuffer.slice(24),
    true
  );
  texture.anisotropicFilteringLevel = 1;
  texture.isBlocking = false;
  texture.name = tName;

  return new Promise<{ BufferFloat: Float32Array; Texture: Texture }>(r => {
    texture.onLoadObservable.addOnce(async texture => {
      const size = texture.getSize();
      let jpegWidth = size.width;
      let jpegHeight = size.height;

      const pixels = new Uint8Array((await texture.readPixels()!).buffer);

      const bufferSize = jpegWidth * jpegHeight * 3;
      const BufferFloat = new Float32Array(bufferSize);

      let j = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        BufferFloat[j++] = pixels[i] / 255;
        BufferFloat[j++] = pixels[i + 1] / 255;
        BufferFloat[j++] = pixels[i + 2] / 255;
      }

      r({ BufferFloat, Texture: texture });
    });
  });
  // decompress into the buffer
  // result = tjDecompress2(tjhandle, jpegBuf, jpegSize, buffer, jpegWidth, 0, jpegHeight, TJPF_RGB, TJFLAG_BOTTOMUP);
}

export function toRadians(angle: number) {
  return angle * (Math.PI / 180);
}

type Bitmask = number;

export const createBinaryMask = (...flags: number[]) =>
  flags.reduce((mask, flag) => mask | flag, 0);

export const isFlagInBinaryMask = (mask: Bitmask, flag: number) =>
  (mask & flag) === flag;

export const isMasksIntersect = (maskA: Bitmask, maskB: Bitmask) =>
  (maskA & maskB) !== 0;

export const addFlagToMask = (mask: Bitmask, flag: number) => mask | flag;

export const removeFlagFromMask = (mask: Bitmask, flag: number) =>
  mask - (mask & flag);

export const toggleFlagInMask = (mask: Bitmask, flag: number) => mask ^ flag;

export const mapNumber = (
  value: number,
  min: number,
  max: number,
  minOut: number,
  maxOut: number
) => {
  return ((value - min) / (max - min)) * (maxOut - minOut) + minOut;
};
