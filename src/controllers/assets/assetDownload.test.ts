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

describe('bundles', () => {
  /** `MUB1`, the header, the bodies: what `tools/assetBundles.ts` writes. */
  function bundleBytes(files: [string, string][]): Uint8Array {
    const header = new TextEncoder().encode(JSON.stringify(files.map(([key, body]) => [key, body.length])));
    const bodies = new TextEncoder().encode(files.map(([, body]) => body).join(''));
    const out = new Uint8Array(8 + header.length + bodies.length);
    out.set(new TextEncoder().encode('MUB1'));
    new DataView(out.buffer).setUint32(4, header.length, true);
    out.set(header, 8);
    out.set(bodies, 8 + header.length);
    return out;
  }

  /** An in-memory `Cache`; `put` reads the body whole, as the real one does. */
  function memoryCache() {
    const store = new Map<string, Response>();
    const cache = {
      match: async (key: string) => store.get(key)?.clone(),
      put: async (key: string, res: Response) => void store.set(key, new Response(await res.arrayBuffer())),
      delete: async (key: string) => store.delete(key),
    };
    return { store, cache: cache as unknown as Cache };
  }

  const bytes = bundleBytes([
    ['./game-assets/World1/EncTerrain1.att.gz', 'abc'],
    ['./game-assets/World1/TerrainLight.OZJ.webp', 'defgh'],
  ]);
  const withBundle = group({ bundle: { url: './bundles/season6-map_1.bin', bytes: bytes.length } });

  it('stores the bundle whole and a marker naming each file slice', async () => {
    vi.resetModules();
    const { storeBundle } = await import('./assetDownload');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes.slice())));
    const { store, cache } = memoryCache();
    const received = vi.fn();

    expect(await storeBundle(withBundle, cache, 'b1', received)).toBe(true);
    expect(new Uint8Array(await (store.get('./bundles/season6-map_1.bin') as Response).clone().arrayBuffer())).toEqual(bytes);
    const marker = await (store.get('./__mu-bundle/map:1') as Response).clone().json();
    const start = bytes.length - 8;
    expect(marker).toEqual({
      build: 'b1',
      bundle: './bundles/season6-map_1.bin',
      files: [
        ['./game-assets/World1/EncTerrain1.att.gz', start, 3],
        ['./game-assets/World1/TerrainLight.OZJ.webp', start + 3, 5],
      ],
    });
    expect(received.mock.calls.reduce((n, [b]) => n + b, 0)).toBe(bytes.length);

    // Stored for this build already: not fetched again.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    expect(await storeBundle(withBundle, cache, 'b1', () => {})).toBe(true);
    vi.unstubAllGlobals();
  });

  it('gives up on a bundle that is short or not a bundle, so the group comes file by file', async () => {
    vi.resetModules();
    const { storeBundle } = await import('./assetDownload');
    for (const body of [bytes.slice(0, 10), new Uint8Array(bytes.length)]) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(body.slice())));
      const { store, cache } = memoryCache();
      const received = vi.fn();
      expect(await storeBundle(withBundle, cache, 'b1', received)).toBe(false);
      expect(store.size).toBe(0);
      expect(received.mock.calls.reduce((n, [b]) => n + b, 0)).toBe(0);
    }
    vi.unstubAllGlobals();
  });

  it('takes the bundle only where the lighter copies are wanted and the sidecars agree', async () => {
    vi.resetModules();
    const { bundleUsable } = await import('./assetDownload');
    const { setLiteAssetsGate } = await import('./liteAssets');
    expect(bundleUsable(withBundle, true, true)).toBe(false);
    setLiteAssetsGate(() => true);
    expect(bundleUsable(withBundle, true, true)).toBe(true);
    expect(bundleUsable(withBundle, true, false)).toBe(false);
    expect(bundleUsable(group(), true, true)).toBe(false);
  });
});

describe('chooseOnly', () => {
  it('ticks exactly the groups asked for, Core always, for this session only', async () => {
    vi.resetModules();
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => '["map:9"]', setItem });
    const { assetDownload } = await import('./assetDownload');
    const map1 = group({ id: 'map:1' });
    const map9 = group({ id: 'map:9' });
    assetDownload.index = { built: '', sidecars: true, groups: [group({ id: 'core', kind: 'core' }), map1, map9] } as never;

    assetDownload.chooseOnly(g => g.id === 'map:1');
    expect(assetDownload.isChosen(map1)).toBe(true);
    expect(assetDownload.isChosen(map9)).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
    expect(assetDownload.blocking).toBe(false);
    vi.unstubAllGlobals();
  });
});
