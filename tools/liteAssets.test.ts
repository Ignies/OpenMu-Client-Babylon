import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, relative } from 'path';
import sharp from 'sharp';
import { liteSourceOf, liteVariantOf } from '../src/controllers/assets/liteAssets';
import { liteAssetsWanted, writeLiteAssets } from './liteAssets';

/** A noisy JPEG, so WebP at quality 90 comes out smaller. */
async function jpeg(): Promise<Uint8Array> {
  const pixels = Buffer.alloc(64 * 64 * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 37) % 251;
  return new Uint8Array(await sharp(pixels, { raw: { width: 64, height: 64, channels: 3 } }).jpeg({ quality: 100 }).toBuffer());
}

/** An uncompressed 32-bit TGA of one colour. */
function tga(size: number): Uint8Array {
  const out = new Uint8Array(18 + size * size * 4).fill(200);
  out.fill(0, 0, 18);
  out[2] = 2;
  out[12] = size;
  out[14] = size;
  out[16] = 32;
  out[17] = 0x28;
  return out;
}

function join2(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

const OZJ_HEADER = new Uint8Array(24).fill(7);
const OZT_HEADER = new Uint8Array(4).fill(9);
let root: string;

function put(file: string, bytes: Uint8Array): void {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), bytes);
}

const files = () =>
  (function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
      e.isDirectory() ? walk(join(dir, e.name)) : [relative(root, join(dir, e.name)).split('\\').join('/')]
    );
  })(root).sort();

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'lite-assets-'));
  const image = await jpeg();
  put('Data/World1/TileGrass01.OZJ', join2(OZJ_HEADER, image));
  put('game-assets/World1/TileGrass02.OZT', join2(OZT_HEADER, tga(32)));
  put('items/item_0_0_0.png', new Uint8Array(await sharp(image).png().toBuffer()));
  put('game-assets/Music/Devias.ogg', new Uint8Array(500).fill(1));
  put('game-assets/Item/Axe01.glb', new Uint8Array(10));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('liteVariantOf', () => {
  it('names each copy beside its original, and finds the original back', () => {
    const pairs: [string, string][] = [
      ['./Data/World1/TileGrass01.OZJ', './Data/World1/TileGrass01.OZJ.webp'],
      ['./game-assets/World1/TileGrass02.OZT', './game-assets/World1/TileGrass02.OZT.webp'],
      ['/items/item_0_0_0.png', '/items/item_0_0_0.webp'],
      ['./game-assets/Music/Devias.ogg', './game-assets/Music/Devias.opus.ogg'],
    ];
    for (const [original, copy] of pairs) {
      expect(liteVariantOf(original)).toBe(copy);
      expect(liteSourceOf(copy)).toBe(original);
    }
  });

  it('gives nothing else a copy', () => {
    for (const path of ['./game-assets/Item/Axe01.glb', './game-assets/Sound/eBow.ogg', './game-assets/Player/skin.webp', './game-assets/Music/Devias.opus.ogg']) {
      expect(liteVariantOf(path)).toBeNull();
    }
    expect(liteSourceOf('./game-assets/Player/skin_warrior_01.webp')).toBeNull();
  });
});

describe('writeLiteAssets', () => {
  it('runs only when asked', () => {
    expect(liteAssetsWanted({}, [])).toBe(false);
    expect(liteAssetsWanted({ MU_LITE_ASSETS: 'off' }, [])).toBe(false);
    expect(liteAssetsWanted({ MU_LITE_ASSETS: 'on' }, [])).toBe(true);
    expect(liteAssetsWanted({}, ['--on'])).toBe(true);
  });

  it('writes each copy beside its original and leaves every original as it was', async () => {
    const before = Object.fromEntries(files().map(f => [f, new Uint8Array(readFileSync(join(root, f)))]));
    const music = async (_source: string, out: string) => (writeFileSync(out, 'OpusHead'), true);

    const stats = await writeLiteAssets(root, { music });

    for (const [file, bytes] of Object.entries(before)) expect(new Uint8Array(readFileSync(join(root, file))), file).toEqual(bytes);
    expect(files()).toEqual(
      [
        ...Object.keys(before),
        'Data/World1/TileGrass01.OZJ.webp',
        'game-assets/World1/TileGrass02.OZT.webp',
        'items/item_0_0_0.webp',
        'game-assets/Music/Devias.opus.ogg',
      ].sort()
    );
    expect(stats.written).toBe(4);

    // The header stays, a WebP behind it.
    const ozj = readFileSync(join(root, 'Data/World1/TileGrass01.OZJ.webp'));
    expect([...ozj.subarray(0, 24)]).toEqual([...OZJ_HEADER]);
    expect(ozj.subarray(24, 28).toString('latin1')).toBe('RIFF');
    expect(ozj.subarray(32, 36).toString('latin1')).toBe('WEBP');
    const ozt = readFileSync(join(root, 'game-assets/World1/TileGrass02.OZT.webp'));
    expect([...ozt.subarray(0, 4)]).toEqual([...OZT_HEADER]);
    expect(await sharp(ozt.subarray(4)).metadata()).toMatchObject({ format: 'webp', width: 32, height: 32 });
  });

  it('gives the music no copy without an encoder', async () => {
    await writeLiteAssets(root);
    expect(existsSync(join(root, 'game-assets/Music/Devias.opus.ogg'))).toBe(false);
  });

  it('leaves out a copy that is not smaller, and drops one whose original is gone', async () => {
    await writeLiteAssets(root, { music: async () => false });
    expect(existsSync(join(root, 'game-assets/Music/Devias.opus.ogg'))).toBe(false);

    rmSync(join(root, 'Data/World1/TileGrass01.OZJ'));
    await writeLiteAssets(root);
    expect(existsSync(join(root, 'Data/World1/TileGrass01.OZJ.webp'))).toBe(false);
  });
});
