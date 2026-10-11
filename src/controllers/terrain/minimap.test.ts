import { describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '@/core/types';

const asked: string[] = [];
vi.mock('@/controllers/assets/mu', () => ({
  // A period tree: World1 has a picture, World3 has none and no marker file.
  hasDataFile: (path: string) => path === 'World1/mini_map.OZT',
  resolveDataUrl: (path: string) => `./Data/${path}`,
  clearSpriteCache: () => {},
  loadMuSprite: (path: string) => {
    asked.push(path);
    return Promise.resolve({ url: 'blob:x', width: 1, height: 1 });
  },
}));
vi.mock('../assets/compressedAssets', () => ({
  fetchAssetBytes: (url: string) => {
    asked.push(url);
    return Promise.reject(new Error('not in this test'));
  },
  prefetchAsset: (url: string) => {
    asked.push(url);
    return Promise.resolve();
  },
}));

// The setup file's maps already loaded the minimap against the real loaders.
vi.resetModules();
const { loadWorldMinimap, prefetchWorldMinimap } = await import('./minimap');

describe('the minimap of a world', () => {
  it('is none, without a request, when the version has no picture for it', async () => {
    asked.length = 0;
    prefetchWorldMinimap(ENUM_WORLD.WD_2DEVIAS);

    expect(await loadWorldMinimap(ENUM_WORLD.WD_2DEVIAS)).toBeNull();
    expect(asked).toEqual([]);
  });

  it('asks only for the files the version has', async () => {
    asked.length = 0;
    const minimap = await loadWorldMinimap(ENUM_WORLD.WD_0LORENCIA);

    expect(minimap?.markers).toEqual([]);
    expect(asked).toEqual(['World1/mini_map.OZT']);
  });
});
