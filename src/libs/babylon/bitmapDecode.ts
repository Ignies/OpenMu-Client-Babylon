import { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { Engine } from '@babylonjs/core/Engines/engine';
// Installs `AbstractEngine._FileToolsLoadImage` before it is wrapped below.
import '@babylonjs/core/Misc/fileTools';
import { devQuery } from '../../common/devSeams';

/**
 * Image textures decode with `createImageBitmap` on the browser's decoder
 * threads, through Babylon's own bitmap branch of `LoadImage`, instead of an
 * <img> that `texImage2D` decodes again on the main thread.
 * Dev seam: `?bitmap=0` keeps the <img>.
 */

const BITMAP = devQuery('bitmap') !== '0';

type BitmapEngine = Pick<
  Engine,
  'createImageBitmap' | '_features' | 'webGLVersion'
>;
type Decode = BitmapEngine['createImageBitmap'];
type LoadImage = typeof AbstractEngine._FileToolsLoadImage;
type ImageLoader = { _FileToolsLoadImage: LoadImage };

/** A 1 x 2 PNG, red over blue. */
const PROBE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAIAAAAW4yFwAAAADUlEQVR42mP4zwAC/wEIAAH/Bs6pJQAAAABJRU5ErkJggg==';

/**
 * An ImageBitmap upload ignores the pixel store flags, so the decode does what
 * Babylon's upload does: no premultiply, no colour space conversion.
 */
export function bitmapDecodeOptions(
  options?: ImageBitmapOptions
): ImageBitmapOptions {
  return {
    ...options,
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  };
}

/**
 * Babylon keeps a blob: URL texture's bitmap as `_buffer` to rebuild it after
 * a context loss. Any other bitmap is spent once `onLoad` has uploaded it.
 */
export function closingLoadImage(load: LoadImage): LoadImage {
  return (input, onLoad, ...rest) =>
    load(
      input,
      image => {
        try {
          onLoad(image);
        } finally {
          const kept = typeof input === 'string' && input.startsWith('blob:');
          if (!kept && 'close' in image) image.close();
        }
      },
      ...rest
    );
}

/**
 * WebKit before 17 decodes bitmaps unreliably (three.js keeps the <img>
 * there too), and the probe below only sees the flip.
 */
function oldWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;

  const agent = navigator.userAgent;
  if (!/^((?!chrome|android).)*safari/i.test(agent)) return false;

  const version = /Version\/(\d+)/.exec(agent);
  return !version || Number(version[1]) < 17;
}

/**
 * A browser that ignores `imageOrientation` would upload every invertY
 * texture upside down.
 */
async function flipsAtDecode(decode: Decode): Promise<boolean> {
  try {
    const bytes = Uint8Array.from(atob(PROBE_PNG), c => c.charCodeAt(0));
    const bitmap = await decode(new Blob([bytes], { type: 'image/png' }), {
      imageOrientation: 'flipY',
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 2;
    const context = canvas.getContext('2d');
    context?.drawImage(bitmap, 0, 0);
    bitmap.close();

    // Loose on purpose: fingerprinting guards nudge read-back bytes.
    const top = context?.getImageData(0, 0, 1, 1).data;
    return !!top && top[2] > 127 && top[0] < 128;
  } catch {
    return false;
  }
}

/**
 * Textures created before this resolves, or in a browser that fails the
 * probe, keep the <img>: both upload the same pixels.
 */
export async function installBitmapDecode(
  engine: BitmapEngine,
  verify: (decode: Decode) => Promise<boolean> = flipsAtDecode,
  loader: ImageLoader = AbstractEngine
): Promise<boolean> {
  // A WebGL1 canvas rescale would flip an already flipped bitmap again.
  if (
    !BITMAP ||
    typeof createImageBitmap !== 'function' ||
    engine.webGLVersion < 2 ||
    oldWebKit()
  ) {
    return false;
  }

  const original = engine.createImageBitmap.bind(engine);
  const decode: Decode = (image, options) =>
    original(image, bitmapDecodeOptions(options));

  if (!(await verify(decode))) return false;

  engine.createImageBitmap = decode;
  loader._FileToolsLoadImage = closingLoadImage(loader._FileToolsLoadImage);
  engine._features.forceBitmapOverHTMLImageElement = true;
  return true;
}
