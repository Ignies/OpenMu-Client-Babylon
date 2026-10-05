import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { Entity, World } from '@/ecs/world';

// How many wick fires the candle lit.
const lit = vi.hoisted(() => ({ fires: 0 }));

vi.mock('@/controllers/fx/effectParticles', () => ({
  BonedParticleEmitter: class {
    constructor() {
      lit.fires++;
    }
    update() {}
  },
}));
// A posed Candle01: its three wick bones.
vi.mock('@/controllers/render/modelObject', () => ({
  ModelObject: class {
    node = { scaling: { x: 1 } };
    gltf = {
      mesh: { getDescendants: () => [] },
      skeleton: { bones: [3, 5, 7].map(i => ({ getTransformNode: () => ({ name: `bone_${i}_` }) })) },
    };
    async init() {}
    async loadSpecificModel() {}
    Update() {}
    dispose() {}
  },
}));

const { CandleObject } = await import('./candleObject');

/** A candle loaded: how many wick fires it lit. */
async function load(): Promise<number> {
  lit.fires = 0;
  // The mocked base takes no arguments.
  const candle = new (CandleObject as unknown as new () => InstanceType<typeof CandleObject>)();
  await candle.init({ scene: {} } as World, {} as Entity);
  return lit.fires;
}

describe('the Lorencia table candle (150), whose rig the Devias candelabra share', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('burns on its wicks on Enhanced (the lampFlares improvement)', async () => {
    expect(await load()).toBe(1);
  });

  // `MoveObject` lights the ground under 150 and nothing else; 54 and 56 have a BlendMesh alone (ZzzObject.cpp:3810-3814, :4587-4590, :4658-4660).
  it('lights no fire on Classic', async () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(await load()).toBe(0);
  });
});
