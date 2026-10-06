import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps/index';
import { terrainFilesFor } from '@/controllers/assets/prefetchWorld';
import { assetUrl, hasAsset } from '@/controllers/assets/resolveUrlToDataFolder';
import { parseTerrainObjects } from '@/controllers/terrain/parseTerrainObjects';
import { placesObject } from '@/controllers/terrain/objectRecords';
import { SOUND_FILES } from '@/controllers/sound/recipes';
import { v097dData } from './index';
import { V097D_ASSET_FILES } from './assets';
import { V097D_SOUNDS } from './sounds';

/**
 * What the 0.97d client asks for is a file that exists, in the case it is
 * asked for, in the tree it is resolved to: its own `public/game-assets-v097d/`
 * or Season 6's `public/game-assets/`. A miss there is the dev server's
 * index.html decoded as a sound or a model.
 */
const PUBLIC = resolve(__dirname, '../../../public');
const listings = new Map<string, Set<string>>();

function listing(dir: string): Set<string> {
  let names = listings.get(dir);
  if (!names) {
    try {
      names = new Set(readdirSync(dir));
    } catch {
      names = new Set();
    }
    listings.set(dir, names);
  }
  return names;
}

/** Exact-case existence of a served url (`./game-assets-v097d/Sound/x.wav`). */
function served(url: string): boolean {
  let dir = PUBLIC;
  for (const part of url.replace(/^\.\//, '').split('/')) {
    if (!listing(dir).has(part)) return false;
    dir = join(dir, part);
  }
  return true;
}

/** The worlds 0.97d ships (World1..World12) that a shared map entry claims; World6 has none. */
const WORLDS = [
  ENUM_WORLD.WD_0LORENCIA,
  ENUM_WORLD.WD_1DUNGEON,
  ENUM_WORLD.WD_2DEVIAS,
  ENUM_WORLD.WD_3NORIA,
  ENUM_WORLD.WD_4LOSTTOWER,
  ENUM_WORLD.WD_6STADIUM,
  ENUM_WORLD.WD_7ATLANSE,
  ENUM_WORLD.WD_8TARKAN,
  ENUM_WORLD.WD_9DEVILSQUARE,
  ENUM_WORLD.WD_10ICARUS,
  ENUM_WORLD.WD_11BLOODCASTLE1,
];

/** The converted files 0.97d ships for its worlds; any other world file is Season 6's. */
const OWN_WORLD_FILES = [
  'World2/EncTerrain2.obj',
  'World3/EncTerrain3.att',
  'World3/EncTerrain3.map',
  'World3/EncTerrain3.obj',
  'World3/TerrainHeight.OZB',
  'World3/TerrainLight.OZJ',
  'World7/EncTerrain7.att',
  'World8/EncTerrain8.att',
  'World8/EncTerrain8.map',
  'World8/EncTerrain8.obj',
  'World8/TerrainHeight.OZB',
  'World9/EncTerrain9.att',
  'World9/EncTerrain9.map',
  'World9/EncTerrain9.obj',
  'World9/TerrainHeight.OZB',
  'World9/TerrainLight.OZJ',
  'World11/EncTerrain11.att',
  'World11/EncTerrain11.map',
  'World11/EncTerrain11.obj',
  'World11/TerrainHeight.OZB',
  'World11/TerrainLight.OZJ',
];

/**
 * Types the terrain places with no `ObjectNN.bmd` behind them in 0.97d's tree or
 * Season 6's (Season 6's own terrain places them too): the original draws nothing.
 */
const NO_SOURCE_BMD = new Set([
  'Object2/Object61.glb',
  'Object5/Object41.glb',
  'Object9/Object04.glb',
  'Object9/Object36.glb',
  'Object9/Object39.glb',
]);

const diskPath = (url: string) => join(PUBLIC, url.replace(/^\.\//, ''));

describe('0.97d worlds', () => {
  it('reads its own terrain and models where they differ from Season 6', () => {
    for (const file of [...OWN_WORLD_FILES, 'Object10/Object03.glb']) {
      expect(assetUrl(v097dData, file), file).toBe(`./game-assets-v097d/${file}`);
    }
    // Devias: 97 of its BMDs differ from Season 6's, and 40 of them convert differently.
    expect(V097D_ASSET_FILES.filter(f => f.startsWith('object3/'))).toHaveLength(40);
  });

  it('serves every terrain file and tile each world asks for', () => {
    const missing = WORLDS.flatMap(map => terrainFilesFor(map))
      .map(file => assetUrl(v097dData, file))
      .filter(url => !served(url));

    expect(missing).toEqual([]);
  });

  it('serves the model of every object type each world places', () => {
    const missing: string[] = [];

    // Lorencia's objects are named models bound in its create.ts, not ObjectNN.
    for (const map of WORLDS.filter(m => m !== ENUM_WORLD.WD_0LORENCIA)) {
      const n = maps.assetWorldNum(map);
      const objects = parseTerrainObjects(
        new Uint8Array(readFileSync(diskPath(assetUrl(v097dData, `World${n}/EncTerrain${n}.obj`))))
      );
      const types = new Set(objects.filter(placesObject).map(o => o.id));

      for (const type of types) {
        if (maps.isEffectOnly(map, type)) continue;
        const file = `Object${n}/Object${String(type + 1).padStart(2, '0')}.glb`;
        if (!NO_SOURCE_BMD.has(file) && !served(assetUrl(v097dData, file))) missing.push(file);
      }
    }

    expect(missing).toEqual([]);
  });
});

describe('0.97d grass cards', () => {
  it('grows grass only from the cards 0.97d ships, never from a borrowed one', () => {
    // Its World1 has TileGrass01.OZT alone; Season 6 added 02 and 03.
    expect(hasAsset(v097dData, 'World1/TileGrass01.OZT')).toBe(true);
    expect(hasAsset(v097dData, 'World1/TileGrass02.OZT')).toBe(false);
    expect(hasAsset(v097dData, 'World1/TileGrass03.OZT')).toBe(false);
  });
});

describe('0.97d sounds', () => {
  it('ships its own file for the 42 sounds and 1 track that differ from Season 6', () => {
    const files = Object.values(V097D_SOUNDS);
    expect(files.filter(f => f.startsWith('Sound/'))).toHaveLength(42);
    expect(files.filter(f => f.startsWith('Music/'))).toEqual(['Music/MuTheme.mp3']);

    for (const [key, file] of Object.entries(V097D_SOUNDS)) {
      expect(SOUND_FILES[key], key).toBeDefined();
      expect(assetUrl(v097dData, file)).toBe(`./game-assets-v097d/${file}`);
    }
  });

  it('serves every catalogue key from a file that exists', () => {
    const missing = Object.entries(SOUND_FILES)
      .map(([key, file]) => assetUrl(v097dData, v097dData.sounds?.[key] ?? file))
      .filter(url => !served(url));

    expect(missing).toEqual([]);
  });
});
