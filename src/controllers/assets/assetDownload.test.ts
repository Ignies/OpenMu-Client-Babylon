import { beforeEach, describe, expect, it, vi } from 'vitest';

const version = { data: { assets: './game-assets/' } };
vi.mock('../../version', () => ({
  get gameVersion() {
    return version;
  },
}));
vi.mock('./mu/dataFolder', () => ({
  resolveDataUrl: (p: string) => `./Data/${p}`,
}));

import { urlsOf, type AssetGroup } from './assetDownload';

const group = (over: Partial<AssetGroup> = {}): AssetGroup => ({
  id: 'map:1',
  kind: 'map',
  name: 'Lorencia',
  world: 1,
  files: 3,
  bytes: 300,
  transfer: 120,
  dirs: [
    ['./game-assets/World1/', [['EncTerrain1.att', 100], ['TerrainLight.OZJ', 100]]],
    ['./Data/World1/', [['mini_map.OZT', 100]]],
  ],
  ...over,
});

beforeEach(() => {
  version.data.assets = './game-assets/';
});

describe('urlsOf', () => {
  it('flattens the directory buckets back into whole URLs', () => {
    expect(urlsOf(group())).toEqual([
      { url: './game-assets/World1/EncTerrain1.att', bytes: 100 },
      { url: './game-assets/World1/TerrainLight.OZJ', bytes: 100 },
      { url: './Data/World1/mini_map.OZT', bytes: 100 },
    ]);
  });
});

describe('the store', () => {
  it('never lets Core be unticked', async () => {
    const { assetDownload } = await import('./assetDownload');
    const core = group({ id: 'core', kind: 'core', name: 'Core' });

    expect(assetDownload.isChosen(core)).toBe(true);
    assetDownload.toggle(core);
    expect(assetDownload.isChosen(core)).toBe(true);
  });

  it('ticks and unticks everything else, and totals the transfer size', async () => {
    vi.resetModules();
    const { assetDownload } = await import('./assetDownload');
    const core = group({ id: 'core', kind: 'core', transfer: 50 });
    const map = group({ id: 'map:1', transfer: 120 });

    assetDownload.index = { built: '', sidecars: true, groups: [core, map] } as never;

    // Core counts even untouched; the map only once chosen.
    expect(assetDownload.selectedTransfer).toBe(50);

    assetDownload.toggle(map);
    expect(assetDownload.isChosen(map)).toBe(true);
    expect(assetDownload.selectedTransfer).toBe(170);

    assetDownload.toggle(map);
    expect(assetDownload.selectedTransfer).toBe(50);
  });
});

describe('lighter copies', () => {
  const lite = group({
    transfer: 120,
    liteTransfer: 90,
    lite: [['./game-assets/World1/', [['TerrainLight.OZJ.webp', 40]]]],
  });

  it('fetches the copy in place of its original only where the world and the player want it', async () => {
    vi.resetModules();
    const { filesToFetch, assetDownload } = await import('./assetDownload');
    const { setLiteAssetsGate, setLiteVariants } = await import('./liteAssets');
    setLiteVariants(['./game-assets/World1/TerrainLight.OZJ.webp']);
    assetDownload.index = { built: '', sidecars: true, groups: [{ ...lite, id: 'core', kind: 'core' }] } as never;

    expect(filesToFetch(lite)).toEqual(urlsOf(lite));
    expect(assetDownload.selectedTransfer).toBe(120);

    setLiteAssetsGate(() => true);
    expect(filesToFetch(lite)).toEqual([
      { url: './game-assets/World1/EncTerrain1.att', bytes: 100 },
      { url: './game-assets/World1/TerrainLight.OZJ.webp', bytes: 40 },
      { url: './Data/World1/mini_map.OZT', bytes: 100 },
    ]);
    expect(assetDownload.selectedTransfer).toBe(90);
  });

  it('tells the reads which copies exist once the index is in', async () => {
    vi.resetModules();
    const { loadAssetsIndex } = await import('./assetDownload');
    const { liteUrl, setLiteAssetsGate } = await import('./liteAssets');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ built: '', sidecars: true, groups: [lite] }))));
    setLiteAssetsGate(() => true);

    expect(liteUrl('./game-assets/World1/TerrainLight.OZJ')).toBeNull();
    await loadAssetsIndex();
    expect(liteUrl('./game-assets/World1/TerrainLight.OZJ')).toBe('./game-assets/World1/TerrainLight.OZJ.webp');
    vi.unstubAllGlobals();
  });
});
