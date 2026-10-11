import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';

const fetched: string[] = [];
vi.mock('../assets/prefetchWorld', () => ({
  fetchTerrainFile: (name: string) => {
    fetched.push(name);
    return Promise.reject(new Error('not in this test'));
  },
}));
vi.mock('../../version', () => ({
  gameVersion: {
    data: {
      folder: './Data-v097d/',
      assets: './game-assets-v097d/',
      locale: '',
      borrows: { assets: './game-assets/', ownAssets: new Set(), lacks: new Set(['world1/tilegrass02.ozt']) },
    },
  },
}));

// The setup file's maps already loaded these modules against the real version.
vi.resetModules();
const { loadGrassCards } = await import('./terrainGrassCards');

describe('loadGrassCards', () => {
  it('never asks for a card the version lacks', async () => {
    const cards = await loadGrassCards({} as Scene, 1);

    expect(fetched.sort()).toEqual(['World1/TileGrass01.OZT', 'World1/TileGrass03.OZT']);
    expect(cards.slots.size).toBe(0);
  });
});
