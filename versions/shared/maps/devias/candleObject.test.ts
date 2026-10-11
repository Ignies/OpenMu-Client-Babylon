import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { World } from '@/ecs/world';

// How many flares the candelabra asked for.
const asked = vi.hoisted(() => ({ flares: 0 }));

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async () => {
    asked.flares++;
    return null;
  },
}));
vi.mock('@/controllers/lighting/mapObjectLights', () => ({
  lightMapObject: () => ({ color: { r: 0, g: 0, b: 0 }, dispose() {} }),
}));
// Three wicks, posed away from the object origin.
vi.mock('../lorencia/candleObject', () => ({
  CandleObject: class {
    Ready = true;
    OutOfView = false;
    node = { scaling: { x: 1 }, getAbsolutePosition: () => ({ x: 0, y: 0, z: 0 }) };
    protected wicks = [1, 2, 3].map(i => ({ getAbsolutePosition: () => ({ x: i, y: 2, z: 0 }) }));
    Update() {}
    dispose() {}
  },
}));
vi.mock('@/ecs/current', () => ({ Ecs: { world: { scene: {} } } }));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { DeviasCandleObject } = await import('./candleObject');

/** A candelabra lit on its first update: how many flares it made. */
function light(): number {
  asked.flares = 0;
  // The mocked base takes no arguments.
  const candelabra = new (DeviasCandleObject as unknown as new () => InstanceType<typeof DeviasCandleObject>)();
  candelabra.Update({ TotalGameTime: { TotalSeconds: 0 } } as World['gameTime']);
  return asked.flares;
}

describe('the Devias candelabra (54, 56)', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('flares on its three wicks on Enhanced (the lampFlares improvement)', () => {
    expect(light()).toBe(3);
  });

  // `CreateObject` gives 54 and 56 a BlendMesh and nothing else (ZzzObject.cpp:4658-4660).
  it('draws no flare on Classic', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(light()).toBe(0);
  });
});
