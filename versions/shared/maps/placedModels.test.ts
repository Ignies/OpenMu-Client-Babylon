import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Every model an object asks for is recorded, and the load stops there.
const { asked, STOP } = vi.hoisted(() => ({ asked: [] as string[], STOP: new Error('stop') }));
vi.mock('@/controllers/assets/modelLoader', async orig => ({
  ...(await orig<object>()),
  loadGLTF: (path: string) => {
    asked.push(path);
    return Promise.reject(STOP);
  },
}));
// A sign plate is a texture, not a model.
vi.mock('../objects/signs/signPlates', async orig => ({ ...(await orig<object>()), prefetchSignPlates: () => {} }));

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { ModelObject } from '@/controllers/render/modelObject';
import { MapTileObject } from '@/controllers/terrain/mapTileObject';
import { placesObject } from '@/controllers/terrain/objectRecords';
import { parseTerrainObjects } from '@/controllers/terrain/parseTerrainObjects';
import { MAP_LAYERS } from './layers';

const ROOT = process.cwd();

/** `MAX_WORLD_OBJECTS` (_enum.h:851): `OpenObjects` loads `Object<n>/ObjectNN.bmd` for slots 0-159 only. */
const MAX_WORLD_OBJECTS = 160;

// A map's `create` reads data files (room records, sign plates) as the browser would.
vi.stubGlobal('fetch', async (input: string) => {
  const url = String(input).replace(/^\.\//, '');
  const file = url.startsWith('game-assets/') ? join(ROOT, 'public', url) : join(ROOT, url);
  return existsSync(file) ? new Response(readFileSync(file)) : new Response(null, { status: 404 });
});

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** The models `factory` asks for when it inits as `type` on `world`. */
async function modelsAsked(factory: typeof ModelObject, world: object, mapIndex: number, type: number) {
  asked.length = 0;
  const object = new factory(scene);
  object.WorldIndex = mapIndex;
  object.Type = type;
  try {
    await object.init(world as never, {} as never);
  } catch (error) {
    if (error !== STOP) asked.push(`init threw ${String(error)}`);
  }
  object.dispose();
  return [...asked];
}

/** A model the original never loads for that slot: no `.bmd` (or no converted `.glb`), or a numbered slot past 159. */
function lacking(path: string): boolean {
  const slot = /^Object\d+\/Object(\d+)\.glb$/.exec(path);
  if (slot && Number(slot[1]) - 1 >= MAX_WORLD_OBJECTS) return true;
  return !existsSync(join(ROOT, 'Data', path.replace(/\.glb$/, '.bmd'))) || !existsSync(join(ROOT, 'public', 'game-assets', path));
}

// `AccessModel` finds no file, `Open2` leaves the slot empty (LoadData.cpp:22-49, ZzzBMD.cpp:3098-3116): a record
// of that type draws no body. Unbound, it asked for a GLB the data never had and logged "Could not load model".
describe.skipIf(!existsSync(join(ROOT, 'Data', 'World1')))('every type a world places', () => {
  for (const layer of MAP_LAYERS) {
    it(`${layer.name}: has its model, is bound absent or is drawn by a class without one`, async () => {
      for (const mapIndex of layer.worlds) {
        const n = layer.assetWorld ?? mapIndex + 1;
        const obj = join(ROOT, 'Data', `World${n}`, `EncTerrain${n}.obj`);
        if (!existsSync(obj)) continue;

        const tiles: (typeof ModelObject)[] = [];
        const world = {
          terrain: { MapTileObjects: tiles },
          mapIndex,
          scene,
          add: (entity: object) => entity,
          with: () => [],
          getTerrainHeight: () => 0,
        };
        await layer.create?.(world as never);

        const types = new Set(parseTerrainObjects(new Uint8Array(readFileSync(obj))).filter(placesObject).map(r => r.id));
        const missing: string[] = [];
        for (const type of [...types].sort((a, b) => a - b)) {
          if (layer.effectOnly?.includes(type)) continue;
          for (const path of await modelsAsked(tiles[type] ?? MapTileObject, world, mapIndex, type)) {
            if (lacking(path)) missing.push(`${type}: ${path}`);
          }
        }
        expect(missing, `world ${mapIndex}`).toEqual([]);
      }
    });
  }
});
