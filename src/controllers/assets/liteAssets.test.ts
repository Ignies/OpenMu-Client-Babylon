import { afterEach, describe, expect, it, vi } from 'vitest';
import { liteFailed, liteUrl, resetLiteAssets, setLiteAssetsGate, setLiteIndexLoader, setLiteVariants } from './liteAssets';
import { fetchAssetBytes } from './compressedAssets';

const TILE = './Data/World1/TileGrass01.OZJ';
const MUSIC = './game-assets/Music/Devias.ogg';

afterEach(() => {
  resetLiteAssets();
  vi.unstubAllGlobals();
});

describe('liteUrl', () => {
  it('takes a listed copy only while the gate allows it', () => {
    setLiteVariants(['./Data/World1/TileGrass01.OZJ.webp', './game-assets/Music/Devias.opus.ogg', './items/item_0_0_0.webp']);
    expect(liteUrl(TILE)).toBeNull();

    setLiteAssetsGate(() => true);
    expect(liteUrl(TILE)).toBe('./Data/World1/TileGrass01.OZJ.webp');
    expect(liteUrl(MUSIC)).toBe('./game-assets/Music/Devias.opus.ogg');
    expect(liteUrl('/items/item_0_0_0.png')).toBe('/items/item_0_0_0.webp');
    // Not listed: the build left it out (not smaller), so the original.
    expect(liteUrl('./Data/World1/TileGrass02.OZJ')).toBeNull();
    expect(liteUrl('./game-assets/Item/Axe01.glb')).toBeNull();
  });

  it('asks for the index once, and reads originals until it is in', () => {
    const load = vi.fn();
    setLiteIndexLoader(load);
    expect(liteUrl(TILE)).toBeNull();
    expect(load).not.toHaveBeenCalled();

    setLiteAssetsGate(() => true);
    expect(liteUrl(TILE)).toBeNull();
    expect(liteUrl(TILE)).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('drops a copy that failed', () => {
    setLiteVariants(['./Data/World1/TileGrass01.OZJ.webp']);
    setLiteAssetsGate(() => true);
    liteFailed('./Data/World1/TileGrass01.OZJ.webp');
    expect(liteUrl(TILE)).toBeNull();
  });
});

describe('fetchAssetBytes with copies', () => {
  const serve = (files: Record<string, string>) => {
    const fetch = vi.fn(async (url: string) =>
      url in files ? new Response(files[url], { headers: { 'content-type': 'application/octet-stream' } }) : new Response('', { status: 404 })
    );
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it('reads the copy where one is wanted and listed', async () => {
    setLiteVariants(['./Data/World1/TileGrass01.OZJ.webp']);
    setLiteAssetsGate(() => true);
    serve({ [TILE]: 'original', [`${TILE}.webp`]: 'copy' });
    expect(new TextDecoder().decode(await fetchAssetBytes(TILE))).toBe('copy');
  });

  it('reads the original when the world or the player says no', async () => {
    setLiteVariants(['./Data/World1/TileGrass01.OZJ.webp']);
    serve({ [TILE]: 'original', [`${TILE}.webp`]: 'copy' });
    expect(new TextDecoder().decode(await fetchAssetBytes(TILE))).toBe('original');
  });

  // Like a missing .gz sidecar: a 404 on the copy never breaks the load, and is not asked twice.
  it('falls back to the original when a listed copy is missing', async () => {
    setLiteVariants(['./Data/World1/TileGrass01.OZJ.webp']);
    setLiteAssetsGate(() => true);
    const fetch = serve({ [TILE]: 'original' });
    expect(new TextDecoder().decode(await fetchAssetBytes(TILE))).toBe('original');
    expect(new TextDecoder().decode(await fetchAssetBytes(TILE))).toBe('original');
    expect(fetch.mock.calls.filter(([url]) => url === `${TILE}.webp`)).toHaveLength(1);
  });
});
