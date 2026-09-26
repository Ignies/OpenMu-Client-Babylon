import type { TilePixels } from '../../common/terrain/tilePack';

/**
 * The terrain's JPEG decode, with no Babylon import so the terrain worker can
 * run it: `createImageBitmap` and a 2D canvas, rows top-down. The tile array
 * decodes here on the main thread, the light map in the worker.
 */

/**
 * What the light map's WebGL upload did, since Babylon sets
 * UNPACK_COLORSPACE_CONVERSION_WEBGL to NONE: an embedded ICC profile is
 * ignored. The tiles keep the default, which is how the array always
 * decoded them.
 */
export const LIGHT_JPEG_DECODE: ImageBitmapOptions = {
  colorSpaceConversion: 'none',
  premultiplyAlpha: 'none',
};

function context2d(
  width: number,
  height: number
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) return context;
  } else {
    const canvas = new OffscreenCanvas(width, height);

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) return context;
  }

  throw new Error('no 2d context');
}

export async function decodeJpegPixels(
  bytes: Uint8Array,
  options?: ImageBitmapOptions
): Promise<TilePixels> {
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  const bitmap = await createImageBitmap(blob, options);
  // A closed ImageBitmap reports 0 x 0, so the size is taken first.
  const { width, height } = bitmap;

  try {
    const context = context2d(width, height);
    context.drawImage(bitmap, 0, 0);

    const image = context.getImageData(0, 0, width, height);

    return { data: image.data, width, height };
  } finally {
    bitmap.close();
  }
}

/** The decoded light map as the bake reads it: 3 floats per texel, 0..1. */
export function lightFromPixels({ data, width, height }: TilePixels) {
  const light = new Float32Array(width * height * 3);

  let j = 0;
  for (let i = 0; i < data.length; i += 4) {
    light[j++] = data[i] / 255;
    light[j++] = data[i + 1] / 255;
    light[j++] = data[i + 2] / 255;
  }

  return light;
}
