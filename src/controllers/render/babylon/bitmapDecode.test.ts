import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bitmapDecodeOptions,
  closingLoadImage,
  installBitmapDecode,
} from './bitmapDecode';

type FakeEngine = Parameters<typeof installBitmapDecode>[0];
type FakeLoader = NonNullable<Parameters<typeof installBitmapDecode>[2]>;
type LoadImage = FakeLoader['_FileToolsLoadImage'];

function fakeLoader() {
  const load = vi.fn(() => null) as unknown as LoadImage;
  return { loader: { _FileToolsLoadImage: load } as FakeLoader, load };
}

function fakeEngine(webGLVersion = 2) {
  const decoded: (ImageBitmapOptions | undefined)[] = [];
  const createImageBitmap = vi.fn(
    (_image: ImageBitmapSource, options?: ImageBitmapOptions) => {
      decoded.push(options);
      return Promise.resolve({} as ImageBitmap);
    }
  );
  const engine = {
    webGLVersion,
    _features: { forceBitmapOverHTMLImageElement: false },
    createImageBitmap,
  } as unknown as FakeEngine;

  return { engine, decoded, createImageBitmap };
}

describe('bitmapDecodeOptions', () => {
  it('forces an unpremultiplied, unconverted decode and keeps the orientation', () => {
    expect(
      bitmapDecodeOptions({
        imageOrientation: 'flipY',
        premultiplyAlpha: 'premultiply',
        colorSpaceConversion: 'default',
      })
    ).toEqual({
      imageOrientation: 'flipY',
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
    expect(bitmapDecodeOptions(undefined)).toEqual({
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
  });
});

describe('closingLoadImage', () => {
  function loadWith(image: HTMLImageElement | ImageBitmap) {
    const load = ((_input, onLoad) => {
      onLoad(image);
      return null;
    }) as LoadImage;
    return closingLoadImage(load);
  }

  it('closes a bitmap once onLoad has used it', () => {
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    const onLoad = vi.fn(() => expect(bitmap.close).not.toHaveBeenCalled());

    loadWith(bitmap)('data:x.jpg', onLoad, () => {}, null);
    expect(onLoad).toHaveBeenCalledWith(bitmap);
    expect(bitmap.close).toHaveBeenCalledTimes(1);

    loadWith(bitmap)(new ArrayBuffer(4), () => {}, () => {}, null);
    expect(bitmap.close).toHaveBeenCalledTimes(2);
  });

  it('keeps a blob: URL bitmap for the context-loss rebuild', () => {
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;

    loadWith(bitmap)('blob:http://x/1', () => {}, () => {}, null);
    expect(bitmap.close).not.toHaveBeenCalled();
  });

  it('closes even when onLoad throws, and leaves an <img> alone', () => {
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    const failing = () => {
      throw new Error('upload');
    };

    expect(() =>
      loadWith(bitmap)('data:x.jpg', failing, () => {}, null)
    ).toThrow('upload');
    expect(bitmap.close).toHaveBeenCalledTimes(1);

    const img = {} as HTMLImageElement;
    const onLoad = vi.fn();
    loadWith(img)('data:x.jpg', onLoad, () => {}, null);
    expect(onLoad).toHaveBeenCalledWith(img);
  });
});

describe('installBitmapDecode', () => {
  beforeEach(() => {
    vi.stubGlobal('createImageBitmap', () => Promise.resolve({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('turns the bitmap path on once the probe passes, decoding through the forced options', async () => {
    const { engine, decoded, createImageBitmap } = fakeEngine();
    const blob = new Blob();

    const verify = vi.fn(async (decode: FakeEngine['createImageBitmap']) => {
      // The probe runs before the engine's decode is replaced.
      expect(engine.createImageBitmap).toBe(createImageBitmap);
      await decode(blob, { imageOrientation: 'flipY' });
      return true;
    });

    const { loader, load } = fakeLoader();
    await expect(installBitmapDecode(engine, verify, loader)).resolves.toBe(
      true
    );
    expect(engine._features.forceBitmapOverHTMLImageElement).toBe(true);
    expect(loader._FileToolsLoadImage).not.toBe(load);

    await engine.createImageBitmap(blob, { premultiplyAlpha: 'none' });
    expect(decoded).toEqual([
      {
        imageOrientation: 'flipY',
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      },
      { premultiplyAlpha: 'none', colorSpaceConversion: 'none' },
    ]);
    expect(createImageBitmap.mock.contexts[0]).toBe(engine);
  });

  it('keeps the <img> path when the probe fails', async () => {
    const { engine, createImageBitmap } = fakeEngine();
    const { loader, load } = fakeLoader();

    await expect(
      installBitmapDecode(engine, async () => false, loader)
    ).resolves.toBe(false);
    expect(engine._features.forceBitmapOverHTMLImageElement).toBe(false);
    expect(engine.createImageBitmap).toBe(createImageBitmap);
    expect(loader._FileToolsLoadImage).toBe(load);
  });

  it('never probes on WebGL1 or without createImageBitmap', async () => {
    const verify = vi.fn(async () => true);

    const webgl1 = fakeEngine(1);
    const { loader } = fakeLoader();
    await expect(
      installBitmapDecode(webgl1.engine, verify, loader)
    ).resolves.toBe(false);
    expect(webgl1.engine._features.forceBitmapOverHTMLImageElement).toBe(
      false
    );

    vi.stubGlobal('createImageBitmap', undefined);
    const bare = fakeEngine();
    await expect(
      installBitmapDecode(bare.engine, verify, loader)
    ).resolves.toBe(false);
    expect(bare.engine._features.forceBitmapOverHTMLImageElement).toBe(false);

    expect(verify).not.toHaveBeenCalled();
  });
});
