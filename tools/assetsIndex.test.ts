import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import type { VersionData } from '../src/version/contract';
import { VERSION_REGISTRY } from '../versions/registry';
import { buildAssetsIndex, INDEXED_VERSIONS } from './assetsIndex';

const season6: VersionData = { folder: './Data/', assets: './game-assets/', locale: 'Eng' };

/** A version shaped like 0.97d: its own trees, and Season 6's for what it does not ship. */
const period: VersionData = {
  folder: './Data-v097d/',
  assets: './game-assets-v097d/',
  locale: '',
  inventory: new Set(['gate.bmd', 'interface/cursor.ozt', 'world3/leaf01.ozj']),
  borrows: {
    assets: './game-assets/',
    ownAssets: new Set(['item/bow01.glb', 'world1/encterrain1.att', 'sound/atower.wav']),
    lacks: new Set(['world1/tilegrass02.ozt']),
    folder: './Data/',
    folderPaths: ['interface/', 'world1/mini_map.ozt'],
  },
  // It plays its own tower sound, so Season 6's aTower.ogg is never asked for.
  sounds: { 'Sound/aTower': 'Sound/aTower.wav' },
};

/** A built `dist/`: file -> size. */
const TREE: Record<string, number> = {
  'game-assets/Item/Axe01.glb': 100,
  'game-assets/Item/Axe01.glb.gz': 40,
  'game-assets/Item/Bow01.glb': 110,
  'game-assets/World1/EncTerrain1.att': 60,
  'game-assets/World1/EncTerrain1.map': 50,
  'game-assets/World1/TileGrass02.OZT': 30,
  'game-assets/World1/x.jpg': 9,
  'game-assets/Sound/aTower.ogg': 20,
  'game-assets-v097d/Item/Bow01.glb': 111,
  'game-assets-v097d/World1/EncTerrain1.att': 61,
  'game-assets-v097d/Sound/aTower.wav': 21,
  'Data/gate.bmd': 5,
  'Data/Interface/Cursor.OZT': 13,
  'Data/Interface/newui_menu01.OZJ': 12,
  'Data/Local/Eng/Item.bmd': 14,
  'Data/World1/mini_map.OZT': 15,
  'Data-v097d/gate.bmd': 4,
  'Data-v097d/Interface/Cursor.OZT': 17,
  'Data-v097d/World3/leaf01.OZJ': 18,
  'items/item_0_0_0.png': 7,
};

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'assets-index-'));
  for (const [file, size] of Object.entries(TREE)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), new Uint8Array(size));
  }
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

/** Every url an index lists, with its size. */
function listed(data: VersionData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of buildAssetsIndex(root, data).groups) {
    for (const [dir, files] of group.dirs) for (const [name, bytes] of files) out[dir + name] = bytes;
  }
  return out;
}

describe('assetsIndex', () => {
  it('indexes Season 6 from its own trees only', () => {
    expect(listed(season6)).toEqual({
      './game-assets/Item/Axe01.glb': 100,
      './game-assets/Item/Bow01.glb': 110,
      './game-assets/World1/EncTerrain1.att': 60,
      './game-assets/World1/EncTerrain1.map': 50,
      './game-assets/World1/TileGrass02.OZT': 30,
      './game-assets/Sound/aTower.ogg': 20,
      './Data/gate.bmd': 5,
      './Data/Interface/Cursor.OZT': 13,
      './Data/Interface/newui_menu01.OZJ': 12,
      './Data/Local/Eng/Item.bmd': 14,
      './Data/World1/mini_map.OZT': 15,
      './items/item_0_0_0.png': 7,
    });
  });

  it('indexes a borrowing version at the url it reads each file from, once', () => {
    expect(listed(period)).toEqual({
      './game-assets/Item/Axe01.glb': 100,
      './game-assets-v097d/Item/Bow01.glb': 111,
      './game-assets-v097d/World1/EncTerrain1.att': 61,
      './game-assets/World1/EncTerrain1.map': 50,
      './game-assets-v097d/Sound/aTower.wav': 21,
      './Data-v097d/gate.bmd': 4,
      './Data-v097d/Interface/Cursor.OZT': 17,
      './Data-v097d/World3/leaf01.OZJ': 18,
      './Data/Interface/newui_menu01.OZJ': 12,
      './Data/World1/mini_map.OZT': 15,
      './items/item_0_0_0.png': 7,
    });
  });

  it('groups a version the way it groups Season 6, and counts each file once', () => {
    const groups = buildAssetsIndex(root, period).groups;
    const byId = Object.fromEntries(groups.map(g => [g.id, g]));

    expect(groups.map(g => g.id)).toEqual(['core', 'audio', 'icons', 'map:1', 'map:3']);
    expect(byId['map:1']).toMatchObject({ name: 'Lorencia', files: 3, bytes: 61 + 50 + 15 });
    // The borrowed sword travels gzipped, as it does for Season 6.
    expect(byId.core).toMatchObject({ files: 5, bytes: 100 + 111 + 4 + 17 + 12, transfer: 40 + 111 + 4 + 17 + 12 });
    expect(groups.reduce((n, g) => n + g.files, 0)).toBe(Object.keys(listed(period)).length);
  });

  it('writes an index for every version the client carries', () => {
    expect(INDEXED_VERSIONS.map(v => v.id)).toEqual(VERSION_REGISTRY.map(v => v.id));
  });
});
