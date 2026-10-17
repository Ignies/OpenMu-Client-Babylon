import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

const files = new Map<string, Uint8Array>();
vi.mock('./dataFolder', () => ({
  hasDataFile: () => true,
  downloadDataFile: async (path: string) => files.get(path) ?? new Uint8Array(),
}));

const { loadMuSprite } = await import('./sprites');

/** A WebP behind an OZJ (24 bytes) or OZT (4 bytes) header, as `tools/liteAssets.ts` writes the copies. */
async function copy(head: number, width: number, height: number): Promise<Uint8Array> {
  const webp = await sharp(Buffer.alloc(width * height * 4, 120), { raw: { width, height, channels: 4 } }).webp().toBuffer();
  const out = new Uint8Array(head + webp.length);
  out.set(new Uint8Array(webp), head);
  return out;
}

describe('loadMuSprite on a lighter copy', () => {
  it('takes the WebP behind either header as it is', async () => {
    files.set('Interface/a.OZJ', await copy(24, 30, 12));
    files.set('Interface/b.OZT', await copy(4, 16, 40));

    expect(await loadMuSprite('Interface/a.OZJ')).toMatchObject({ width: 30, height: 12 });
    expect(await loadMuSprite('Interface/b.OZT')).toMatchObject({ width: 16, height: 40 });
  });
});
