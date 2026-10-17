import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { imageMimeOf, isWebp, webpSize } from './imageBytes';

const image = (channels: 3 | 4) => sharp(Buffer.alloc(37 * 21 * channels, 90), { raw: { width: 37, height: 21, channels } });
const bytes = async (made: Promise<Buffer>) => new Uint8Array(await made);

describe('imageBytes', () => {
  it('tells a WebP from the JPEG an OZJ carries', async () => {
    const jpeg = await bytes(image(3).jpeg().toBuffer());
    const webp = await bytes(image(3).webp().toBuffer());

    expect(isWebp(jpeg)).toBe(false);
    expect(imageMimeOf(jpeg)).toBe('image/jpeg');
    expect(isWebp(webp)).toBe(true);
    expect(imageMimeOf(webp)).toBe('image/webp');
    expect(webpSize(jpeg)).toBeNull();
  });

  it('reads the size of a lossy, a lossless and an extended WebP', async () => {
    for (const made of [image(3).webp(), image(3).webp({ lossless: true }), image(4).webp({ alphaQuality: 50 })]) {
      expect(webpSize(await bytes(made.toBuffer()))).toEqual({ width: 37, height: 21 });
    }
  });
});
