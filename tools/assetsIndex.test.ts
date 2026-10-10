import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import type { VersionData } from '../src/version/contract';
import { VERSION_REGISTRY } from '../versions/registry';
import { MAP_LAYERS } from '../versions/shared/maps/layers';
import { buildAssetsIndex, INDEXED_VERSIONS } from './assetsIndex';

const season6: VersionData = { folder: './Data/', assets: './game-assets/', locale: 'Eng', worlds: [1, 19] };

/** A version shaped like 0.97d: its own trees, and Season 6's for what it does not ship. */
const period: VersionData = {
  folder: './Data-v097d/',
  assets: './game-assets-v097d/',
  locale: '',
  // It has World3 and not Chaos Castle's World19.
  worlds: [1, 3],
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
  'game-assets/World19/EncTerrain19.att': 70,
  'game-assets/Object19/Object01.glb': 80,
  'game-assets/Sound/aTower.ogg': 20,
  'game-assets-v097d/Item/Bow01.glb': 111,
  'game-assets-v097d/World1/EncTerrain1.att': 61,
  'game-assets-v097d/Sound/aTower.wav': 21,
  'Data/gate.bmd': 5,
  'Data/Interface/Cursor.OZT': 13,
  'Data/Interface/newui_menu01.OZJ': 12,
  'Data/Local/Eng/Item.bmd': 14,
  'Data/World1/mini_map.OZT': 15,
  // A world folder spelled in lower case is still that world, not core.
  'Data/world55/leaf01.OZT': 16,
  'game-assets/object55/Object01.glb': 19,
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
      './game-assets/World19/EncTerrain19.att': 70,
      './game-assets/Object19/Object01.glb': 80,
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

  // Season 6 also ships World6 (Exile, map 5), World55/56 and Object55/56 (the old character and login
  // scenes, maps 54/55): no map entry claims them, and its login and character scenes are 73 and 74.
  // 0.97d's client ships World1-12, World6 among them, which no map entry claims either.
  it('offers each version every world folder a map reads, and no other', () => {
    const ROOT = join(import.meta.dirname, '..');
    const numbers = (dir: string, folder: RegExp) =>
      readdirSync(join(ROOT, dir)).flatMap(name => folder.exec(name)?.slice(1).map(Number) ?? []);
    const shipped = new Set([
      ...numbers('public/game-assets', /^(?:World|Object)(\d+)$/i),
      ...numbers('Data', /^World(\d+)$/i),
    ]);
    const read = new Set(MAP_LAYERS.flatMap(layer => layer.worlds.map(world => layer.assetWorld ?? world + 1)));
    const worlds = Object.fromEntries(INDEXED_VERSIONS.map(v => [v.id, [...v.data.worlds]]));

    const sorted = (list: number[]) => list.sort((a, b) => a - b);

    expect(sorted(worlds.season6)).toEqual(sorted([...read]));
    expect(worlds.season6.filter(world => !shipped.has(world))).toEqual([]);
    expect(sorted(worlds.v097d)).toEqual(sorted([...read].filter(world => world <= 12)));
  });
});
