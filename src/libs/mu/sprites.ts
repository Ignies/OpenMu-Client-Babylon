import { downloadDataFile, hasDataFile } from './dataFolder';
import { decodeTGA } from './tga';

/**
 * What a path the active version's tree does not contain decodes to: a 1x1
 * transparent pixel, so a frame drawn from it is empty rather than an error
 * per paint. A data URL and not a blob, so `clearSpriteCache` has nothing to
 * revoke. See `hasDataFile`.
 */
const ABSENT_SPRITE: MuSprite = {
  url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  width: 1,
  height: 1,
};

const OZJ_HEADER_SIZE = 24;
const OZT_HEADER_SIZE = 4;

export type MuSprite = {
  url: string;
  width: number;
  height: number;
};

const cache = new Map<string, Promise<MuSprite>>();
/** Resolved sprites, for the synchronous `peekSprite` read. */
const ready = new Map<string, MuSprite>();

export function loadMuSprite(path: string): Promise<MuSprite> {
  const key = path.toLowerCase();

  let sprite = cache.get(key);

  if (!sprite) {
    sprite = loadSprite(path).then(
      loaded => {
        ready.set(key, loaded);
        return loaded;
      },
      err => {
        cache.delete(key);
        throw err;
      }
    );
    cache.set(key, sprite);
  }

  return sprite;
}

export function loadInterfaceSprite(fileName: string): Promise<MuSprite> {
  return loadMuSprite(`Interface/${fileName}`);
}

/**
 * The sprite if it has already been decoded, without waiting. Lets a React
 * component mount with its background in place (no empty first paint, no
 * state update per square) once the preloader has run.
 */
export function peekMuSprite(path: string): MuSprite | null {
  return ready.get(path.toLowerCase()) ?? null;
}

export function peekInterfaceSprite(fileName: string): MuSprite | null {
  return peekMuSprite(`Interface/${fileName}`);
}

/**
 * Drop every decoded sprite (or only those the filter accepts) and revoke
 * their blob URLs. Called when the world is left so the ~120 window sprites
 * do not stay pinned across a logout.
 */
export function clearSpriteCache(filter?: (path: string) => boolean): void {
  for (const [key, pending] of cache) {
    if (filter && !filter(key)) continue;
    cache.delete(key);
    ready.delete(key);
    pending.then(
      sprite => URL.revokeObjectURL(sprite.url),
      () => {}
    );
  }
}

async function loadSprite(path: string): Promise<MuSprite> {
  if (!hasDataFile(path)) return ABSENT_SPRITE;

  const buffer = await downloadDataFile(path);
  const ext = path.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ozj':
      return spriteFromJPEG(path, buffer);
    case 'ozt':
      return spriteFromTGA(path, buffer);
    default:
      throw new Error(`Unsupported sprite format for ${path}`);
  }
}

/**
 * Width / height from the JPEG's first frame header (SOF0..SOF15, minus the
 * DHT/JPG/DAC markers that share the range). Reading it costs a few byte
 * compares; the alternative — `createImageBitmap` — decodes the whole image
 * a second time just to measure it, and the browser decodes it again anyway
 * when the blob URL is painted.
 */
function jpegSize(jpeg: Uint8Array): { width: number; height: number } | null {
  let i = 2; // past FFD8
  while (i + 9 < jpeg.length) {
    if (jpeg[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = jpeg[i + 1];
    // Padding / RST markers carry no length.
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    const length = (jpeg[i + 2] << 8) | jpeg[i + 3];
    const isSOF =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSOF) {
      const height = (jpeg[i + 5] << 8) | jpeg[i + 6];
      const width = (jpeg[i + 7] << 8) | jpeg[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (marker === 0xda || marker === 0xd9) return null; // SOS / EOI: no SOF seen
    i += 2 + length;
  }
  return null;
}

async function spriteFromJPEG(
  path: string,
  buffer: Uint8Array
): Promise<MuSprite> {
  if (buffer.length <= OZJ_HEADER_SIZE) {
    throw new Error(`${path} is too small to be an OZJ`);
  }

  const jpeg = buffer.slice(OZJ_HEADER_SIZE);

  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    throw new Error(`${path} has no JPEG marker at offset ${OZJ_HEADER_SIZE}`);
  }

  const blob = new Blob([jpeg], { type: 'image/jpeg' });
  const size = jpegSize(jpeg);

  if (size) {
    return { url: URL.createObjectURL(blob), ...size };
  }

  // A header the scanner did not understand: measure the slow way.
  const bitmap = await createImageBitmap(blob);
  try {
    return {
      url: URL.createObjectURL(blob),
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

async function spriteFromTGA(
  path: string,
  buffer: Uint8Array
): Promise<MuSprite> {
  const { width, height, pixels } = decodeTGA(
    path,
    buffer.slice(OZT_HEADER_SIZE)
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error(`Could not get a 2d context to decode ${path}`);
  }

  ctx.putImageData(new ImageData(pixels, width, height), 0, 0);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/png')
  );

  if (!blob) {
    throw new Error(`Could not encode ${path} as PNG`);
  }

  return { url: URL.createObjectURL(blob), width, height };
}
