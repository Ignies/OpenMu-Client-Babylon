import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LIGHT_JPEG_DECODE,
  decodeJpegPixels,
  lightFromPixels,
} from './terrainJpeg';

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The conversion `readOJZBufferAsJPEGBuffer` runs over its readback. */
function readbackFloats(pixels: Uint8Array, width: number, height: number) {
  const BufferFloat = new Float32Array(width * height * 3);

  let j = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    BufferFloat[j++] = pixels[i] / 255;
    BufferFloat[j++] = pixels[i + 1] / 255;
    BufferFloat[j++] = pixels[i + 2] / 255;
  }

  return BufferFloat;
}

describe('lightFromPixels', () => {
  it('matches the readback conversion byte for byte', () => {
    const width = 256;
    const height = 256;
    const random = mulberry32(18);
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i++) data[i] = (random() * 256) | 0;
    // Every byte value in every channel, whatever the generator drew.
    for (let v = 0; v < 256; v++) data.fill(v, v * 4, v * 4 + 4);

    const light = lightFromPixels({ data, width, height });
    const reference = readbackFloats(
      new Uint8Array(data.buffer),
      width,
      height
    );

    const bytes = new Uint8Array(light.buffer);
    const expected = new Uint8Array(reference.buffer);

    expect(light.length).toBe(width * height * 3);
    expect(bytes.length).toBe(expected.length);
    expect(bytes.findIndex((b, i) => b !== expected[i])).toBe(-1);
  });

  it('drops alpha and keeps the rows in the order they were decoded', () => {
    const data = new Uint8ClampedArray([
      255, 0, 128, 7, 1, 2, 3, 0, 10, 20, 30, 255, 40, 50, 60, 9,
    ]);

    const light = lightFromPixels({ data, width: 2, height: 2 });

    expect(Array.from(light)).toEqual(
      [255, 0, 128, 1, 2, 3, 10, 20, 30, 40, 50, 60].map(v =>
        Math.fround(v / 255)
      )
    );
  });
});

type Calls = {
  blobs: Blob[];
  options: (ImageBitmapOptions | undefined)[];
  canvases: { width: number; height: number }[];
  contextOptions: unknown[];
  drawn: unknown[][];
  read: number[][];
  closed: number;
  events: string[];
};

function stubDecoder(
  { width, height }: { width: number; height: number },
  { document: withDocument = false, context = true } = {}
) {
  const calls: Calls = {
    blobs: [],
    options: [],
    canvases: [],
    contextOptions: [],
    drawn: [],
    read: [],
    closed: 0,
    events: [],
  };
  const pixels = new Uint8ClampedArray(width * height * 4).map((_, i) => i);

  const bitmap = {
    width,
    height,
    close() {
      calls.closed++;
      calls.events.push('close');
      this.width = 0;
      this.height = 0;
    },
  };

  const context2d = {
    drawImage: (...args: unknown[]) => {
      calls.drawn.push(args);
      calls.events.push('draw');
    },
    getImageData: (...args: number[]) => {
      calls.read.push(args);
      calls.events.push('read');
      return { data: pixels };
    },
  };

  class FakeCanvas {
    constructor(
      public width = 0,
      public height = 0
    ) {
      calls.canvases.push(this);
    }

    getContext(kind: string, options: unknown) {
      expect(kind).toBe('2d');
      calls.contextOptions.push(options);
      return context ? context2d : null;
    }
  }

  vi.stubGlobal(
    'createImageBitmap',
    async (blob: Blob, options?: ImageBitmapOptions) => {
      calls.blobs.push(blob);
      calls.options.push(options);
      return bitmap;
    }
  );

  if (withDocument) {
    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        expect(tag).toBe('canvas');
        return new FakeCanvas();
      },
    });
  } else {
    vi.stubGlobal('OffscreenCanvas', FakeCanvas);
  }

  return { calls, pixels, bitmap };
}

describe('decodeJpegPixels', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('decodes the light map in a worker with no colour conversion', async () => {
    const { calls, pixels, bitmap } = stubDecoder({ width: 4, height: 3 });
    const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);

    const decoded = await decodeJpegPixels(jpeg, LIGHT_JPEG_DECODE);

    expect(LIGHT_JPEG_DECODE).toEqual({
      colorSpaceConversion: 'none',
      premultiplyAlpha: 'none',
    });
    expect(calls.options).toEqual([LIGHT_JPEG_DECODE]);
    expect(calls.blobs[0].type).toBe('image/jpeg');
    expect(new Uint8Array(await calls.blobs[0].arrayBuffer())).toEqual(jpeg);

    expect(calls.canvases).toEqual([
      expect.objectContaining({ width: 4, height: 3 }),
    ]);
    expect(calls.contextOptions).toEqual([{ willReadFrequently: true }]);
    expect(calls.drawn).toEqual([[bitmap, 0, 0]]);
    expect(calls.read).toEqual([[0, 0, 4, 3]]);
    expect(calls.events).toEqual(['draw', 'read', 'close']);

    expect(decoded).toEqual({ data: pixels, width: 4, height: 3 });
    expect(decoded.data).toBe(pixels);
  });

  it('decodes the tiles on the main thread with the default options', async () => {
    const { calls } = stubDecoder({ width: 2, height: 2 }, { document: true });

    const decoded = await decodeJpegPixels(new Uint8Array([1, 2, 3]));

    expect(calls.options).toEqual([undefined]);
    expect(calls.canvases).toEqual([
      expect.objectContaining({ width: 2, height: 2 }),
    ]);
    expect(calls.contextOptions).toEqual([{ willReadFrequently: true }]);
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(2);
    expect(calls.closed).toBe(1);
  });

  it('rejects without a 2d context and still closes the bitmap', async () => {
    const { calls } = stubDecoder({ width: 2, height: 2 }, { context: false });

    await expect(
      decodeJpegPixels(new Uint8Array([1]), LIGHT_JPEG_DECODE)
    ).rejects.toThrow('no 2d context');
    expect(calls.closed).toBe(1);
  });
});
