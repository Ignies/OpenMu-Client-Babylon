import { describe, expect, it } from 'vitest';
import type { VersionData } from '../../version/contract';
import { assetsIndexUrl, assetUrl, hasAsset } from './resolveUrlToDataFolder';

const season6: VersionData = { folder: './Data/', assets: './game-assets/', locale: 'Eng', worlds: [] };

const period: VersionData = {
  folder: './Data-v097d/',
  assets: './game-assets-v097d/',
  locale: '',
  worlds: [],
  borrows: {
    assets: './game-assets/',
    ownAssets: new Set(['world3/encterrain3.att', 'sound/atower.wav']),
    lacks: new Set(['world1/tilegrass02.ozt']),
  },
};

describe('assetUrl', () => {
  it('keeps every file on the version root when it borrows nothing', () => {
    expect(assetUrl(season6, 'World3/EncTerrain3.att')).toBe('./game-assets/World3/EncTerrain3.att');
    expect(assetUrl(season6, '/Sound/eBow.ogg')).toBe('./game-assets/Sound/eBow.ogg');
  });

  it('serves the files a version ships from its own root, whatever their case', () => {
    expect(assetUrl(period, 'World3/EncTerrain3.att')).toBe('./game-assets-v097d/World3/EncTerrain3.att');
    expect(assetUrl(period, 'Sound/ATower.wav')).toBe('./game-assets-v097d/Sound/ATower.wav');
  });

  it('serves every other file from the tree it borrows', () => {
    expect(assetUrl(period, 'World3/TileGrass01.OZJ')).toBe('./game-assets/World3/TileGrass01.OZJ');
    expect(assetUrl(period, '/Effect/FlameStrike.glb')).toBe('./game-assets/Effect/FlameStrike.glb');
  });

  it('borrows nothing the version lacks: its absence is the original one', () => {
    expect(assetUrl(period, 'World1/TileGrass02.OZT')).toBe('./game-assets-v097d/World1/TileGrass02.OZT');
    expect(hasAsset(period, 'World1/TileGrass02.OZT')).toBe(false);
    expect(hasAsset(period, 'World1/TileGrass01.OZT')).toBe(true);
    expect(hasAsset(season6, 'World1/TileGrass02.OZT')).toBe(true);
  });

  it('leaves absolute and inline urls alone', () => {
    expect(assetUrl(period, 'https://cdn.example/x.glb')).toBe('https://cdn.example/x.glb');
    expect(assetUrl(period, 'base64:AAAA')).toBe('base64:AAAA');
  });
});

describe('assetsIndexUrl', () => {
  it('names each version its own pre-download index, beside its converted tree', () => {
    expect(assetsIndexUrl(season6)).toBe('./assets-index.json');
    expect(assetsIndexUrl(period)).toBe('./assets-index-v097d.json');
    expect(assetsIndexUrl({ ...season6, assets: 'https://cdn.example/game-assets' })).toBe(
      'https://cdn.example/assets-index.json'
    );
  });
});
