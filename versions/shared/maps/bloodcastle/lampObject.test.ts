import { describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '@/ecs/world';

// The sheet each flare the lamp asked for is drawn from.
const sheets = vi.hoisted(() => [] as (string | undefined)[]);

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async (_scene: unknown, _scale: number, _color: unknown, texture?: string) => {
    sheets.push(texture);
    return null;
  },
}));
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    Ready = true;
    OutOfView = false;
    node = { scaling: { x: 1 } };
    async init() {}
    Update() {}
    dispose() {}
  },
}));
vi.mock('./bones', () => ({
  findBone: () => ({ getAbsolutePosition: () => ({ x: 0, y: 0, z: 0 }) }),
  bonePosed: () => true,
}));
vi.mock('@/ecs/current', () => ({ Ecs: { world: { scene: {} } } }));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { BloodCastleLampObject } = await import('./lampObject');

describe('the Blood Castle throne-room lamp (type 13)', () => {
  // CreateSprite(BITMAP_FLARE, ...) on bone 3; BITMAP_FLARE is Flare.jpg (ZzzOpenData.cpp:5309).
  it('draws its flare from the BITMAP_FLARE sheet (ZzzObject.cpp:3176-3181)', async () => {
    // The mocked base takes no arguments.
    const lamp = new (BloodCastleLampObject as unknown as new () => InstanceType<typeof BloodCastleLampObject>)();
    await lamp.init({} as World, {} as Entity);
    lamp.Update({ TotalGameTime: { TotalSeconds: 0 } } as World['gameTime']);
    expect(sheets).toEqual(['flare']);
  });
});
