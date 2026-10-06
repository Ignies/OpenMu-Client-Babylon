import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { World } from '@/ecs/world';
import { parseTerrainObjects } from '@/controllers/terrain/parseTerrainObjects';
import { placesObject } from '@/controllers/terrain/objectRecords';
import { bindAbsentModels } from '../shared/objectVariants';
import { createDoppelganger4 } from './create';
import { DOPPELGANGER4_ABSENT_MODELS, DOPPELGANGER4_EFFECT_ONLY_TYPES } from './spec';

const DATA = join(process.cwd(), 'Data');

/** `MAX_WORLD_OBJECTS` (_enum.h:851): `LoadWorld` fills no slot past it from the folder. */
const MAX_WORLD_OBJECTS = 160;

describe('the Doppelganger 4 types placed without a model', () => {
  // `AccessModel` finds no file, `Open2` releases the slot (LoadData.cpp:22-49, ZzzBMD.cpp:3098-3116): the record
  // draws nothing. Unbound, the type asked for a GLB the data never had and logged a failed load.
  it('are bound as absent, so none asks for a model', async () => {
    const tiles: unknown[] = [];
    await createDoppelganger4({ terrain: { MapTileObjects: tiles } } as unknown as World);
    const absent: unknown[] = [];
    bindAbsentModels(absent as never, [0]);
    expect(DOPPELGANGER4_ABSENT_MODELS.length).toBeGreaterThan(0);
    for (const type of DOPPELGANGER4_ABSENT_MODELS) expect(tiles[type], String(type)).toBe(absent[0]);
  });

  it.skipIf(!existsSync(join(DATA, 'World69')))('are the folder types EncTerrain69.obj places that Object69 lacks', () => {
    const records = parseTerrainObjects(new Uint8Array(readFileSync(join(DATA, 'World69', 'EncTerrain69.obj'))));
    const lacking = [...new Set(records.filter(placesObject).map(record => record.id))]
      .filter(type => type < MAX_WORLD_OBJECTS && !DOPPELGANGER4_EFFECT_ONLY_TYPES.includes(type))
      .filter(type => !existsSync(join(DATA, 'Object69', `Object${String(type + 1).padStart(2, '0')}.bmd`)))
      .sort((a, b) => a - b);
    expect(lacking).toEqual([...DOPPELGANGER4_ABSENT_MODELS]);
  });
});
