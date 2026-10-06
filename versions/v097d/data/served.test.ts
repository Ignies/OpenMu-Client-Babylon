import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps/index';
import { terrainFilesFor } from '@/controllers/assets/prefetchWorld';
import { assetUrl, hasAsset } from '@/controllers/assets/resolveUrlToDataFolder';
import { dataUrl, hasData } from '@/controllers/assets/mu/dataFolder';
import { parseGates } from '@/controllers/assets/mu/gates';
import { parseTerrainObjects } from '@/controllers/terrain/parseTerrainObjects';
import { placesObject } from '@/controllers/terrain/objectRecords';
import { SOUND_FILES } from '@/controllers/sound/recipes';
import { monsterModelFile } from '@/controllers/actors/monsterModelTable';
import { NPC_MODEL_TABLE, npcModelFile } from '@/controllers/actors/npcModelTable';
import { ItemsDatabase } from '../../shared/items/itemsDatabase';
import { monsters } from '../../shared/monsters/all';
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

/** Exact-case existence of a served url (`./game-assets-v097d/Sound/x.wav`) under `root`. */
function served(url: string, root = PUBLIC): boolean {
  let dir = root;
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

/** The class bodies 0.97d's `Player/` ships: `<Part>Class01..05` and `201..203`. */
const CLASS_SKINS = [1, 2, 3, 4, 5, 201, 202, 203];

/**
 * Models no tree serves, Season 6 included: monster 50 has no row and no BMD (`tools/assetCase.test.ts`);
 * the Summoner's Queen set names no BMD either, and Merlin Staff's `summonsprit.bmd` was never converted.
 */
const NO_MODEL = new Set([
  'Monster/Monster50.glb',
  'Item/summonsprit.glb',
  ...['Helm', 'Armor', 'Pant', 'Glove', 'Boot'].map(part => `Player/${part}Mail_succubus.glb`),
]);

describe('0.97d characters and items', () => {
  it('serves the model of every item, class body, monster and NPC', () => {
    const files = [
      ...ItemsDatabase.all()
        .filter(item => item.szModelFolder !== 'Empty')
        .map(item => `${item.szModelFolder}${item.szModelName}`),
      'Player/player.glb',
      ...['Helm', 'Armor', 'Pant', 'Glove', 'Boot'].flatMap(part =>
        CLASS_SKINS.map(skin => `Player/${part}Class${String(skin).padStart(2, '0')}.glb`)
      ),
      ...monsters.all().flatMap(def => (def.model ? [monsterModelFile(def.model.type)] : [])),
      ...Object.values(NPC_MODEL_TABLE).map(([file]) => npcModelFile(file)),
    ];
    const missing = files.filter(file => !NO_MODEL.has(file) && !served(assetUrl(v097dData, file)));

    expect(missing).toEqual([]);
  });
});

/** A `Data/` url on disk: `./Data-v097d/x` and `./Data/x` sit at the repo root. */
const REPO = resolve(__dirname, '../../..');

describe('0.97d Data tree', () => {
  it('decodes its own gate table: 100 records of 9 bytes', () => {
    const gates = parseGates(new Uint8Array(readFileSync(join(REPO, 'Data-v097d/gate.bmd'))), v097dData.gates);

    expect(gates).toHaveLength(100);
    // Lorencia's dungeon stairs, and the Dungeon landing they lead to.
    expect(gates[1]).toMatchObject({ flag: 1, map: 0, x1: 121, y1: 232, x2: 123, y2: 233, target: 2, level: 20 });
    expect(gates[2]).toMatchObject({ flag: 2, map: 1, x1: 107, y1: 247, x2: 110, y2: 247 });
    // Every entrance leads to an exit: the layout is right, not just the first record.
    for (const gate of gates.filter(g => g.flag === 1)) {
      expect(gates[gate.target].flag, `gate ${gate.index}`).toBe(2);
    }
  });

  it('draws a minimap picture only where its terrain is Season 6 terrain', () => {
    // World1, 2, 4 and 5 share Season 6's EncTerrain map; Devias, Atlans, Tarkan and Icarus do not.
    for (const n of [1, 2, 4, 5]) {
      expect(served(dataUrl(v097dData, `World${n}/mini_map.OZT`), REPO), `World${n}`).toBe(true);
    }
    for (const n of [3, 8, 9, 11]) {
      expect(hasData(v097dData, `World${n}/mini_map.OZT`), `World${n}`).toBe(false);
    }
  });

  it('reads the sign plates of its maps, Season 6 copies of the same bytes', () => {
    for (const plate of ['Object1/notice.OZJ', 'Object3/snotice.OZJ', 'Object3/snotice02.OZJ', 'Object7/notice.OZJ']) {
      expect(hasData(v097dData, plate), plate).toBe(true);
      expect(served(dataUrl(v097dData, plate), REPO), plate).toBe(true);
    }
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
