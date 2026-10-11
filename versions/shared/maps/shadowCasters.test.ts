import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

vi.mock('../objects/signs/signPlates', async orig => ({ ...(await orig<object>()), prefetchSignPlates: () => {} }));

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { ENUM_WORLD } from '@/core/types';
import type { ModelObject } from '@/controllers/render/modelObject';
import type { World } from '@/ecs/world';
import { createBloodCastle } from './bloodcastle/create';
import { createValleyOfLoren } from './valleyofloren/create';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** `[type, mesh the shadow leaves out]` for every type the map binds to a shadowed class. */
async function casters(create: (world: World) => Promise<void>, mapIndex: ENUM_WORLD) {
  const tiles: (typeof ModelObject)[] = [];
  await create({ mapIndex, terrain: { MapTileObjects: tiles } } as unknown as World);
  const out: [number, number][] = [];
  tiles.forEach((factory, type) => {
    const object = new factory(scene);
    if (object.MapShadow) out.push([type, object.ShadowHiddenMesh]);
    object.dispose();
  });
  return out;
}

// The only map objects the original shadows: their cases call RenderBodyShadow.
describe('the map objects that cast a Classic shadow', () => {
  it('are Blood Castle 28 and 29 without mesh 2 (ZzzObject.cpp:1041-1057)', async () => {
    expect(await casters(createBloodCastle, ENUM_WORLD.WD_11BLOODCASTLE1)).toEqual([[28, 2], [29, 2]]);
  });

  it('are Valley of Loren 50, 83 and 85 outside a siege (GMBattleCastle.cpp:1219-1228)', async () => {
    expect(await casters(createValleyOfLoren, ENUM_WORLD.WD_30BATTLECASTLE)).toEqual([[50, -1], [83, -1], [85, -1]]);
  });
});
