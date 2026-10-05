import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { Entity, World } from '@/ecs/world';

// The flares and ground lights the candelabra asked for.
const asked = vi.hoisted(() => ({ flares: 0, grounds: 0 }));

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async () => {
    asked.flares++;
    return null;
  },
}));
vi.mock('@/controllers/lighting/mapObjectLights', () => ({
  lightMapObjectWith: () => {
    asked.grounds++;
    return { dispose() {} };
  },
}));
vi.mock('@/controllers/lighting/lightSource', () => ({ PRIORITY_TORCH: 1 }));
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    Ready = true;
    OutOfView = false;
    node = { scaling: { x: 1 }, rotation: { y: 0 }, getAbsolutePosition: () => ({ x: 0, y: 0, z: 0 }) };
    async init() {}
    Update() {}
    dispose() {}
  },
}));
vi.mock('./bones', () => ({
  findBone: () => ({ getAbsolutePosition: () => ({ x: 0, y: 1, z: 0 }) }),
  bonePosed: () => true,
}));
vi.mock('@/ecs/current', () => ({ Ecs: { world: { scene: {} } } }));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { BloodCastleCandelabraObject } = await import('./candelabraObject');

/** A candelabra lit on its first update. */
async function light() {
  asked.flares = asked.grounds = 0;
  // The mocked base takes no arguments.
  const candelabra = new (BloodCastleCandelabraObject as unknown as new () => InstanceType<typeof BloodCastleCandelabraObject>)();
  await candelabra.init({} as World, {} as Entity);
  candelabra.Update({ TotalGameTime: { TotalSeconds: 0 } } as World['gameTime']);
  return { ...asked };
}

describe('the Blood Castle candelabra (type 11)', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('flares on its seven candles and lights the ground on Enhanced (the lampFlares improvement)', async () => {
    expect(await light()).toEqual({ flares: 7, grounds: 1 });
  });

  // Seven `CreateSprite(BITMAP_LIGHT, ...)` and no `AddTerrainLight` (ZzzObject.cpp:3161-3175).
  it('lights no ground on Classic, its seven flares kept', async () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(await light()).toEqual({ flares: 7, grounds: 0 });
  });
});
