import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { Entity, World } from '@/ecs/world';

// What the brazier made and what it did to its card.
const made = vi.hoisted(() => ({ flareScales: [] as number[], scales: [] as number[], lumis: [] as number[], fires: 0 }));

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async (_scene: unknown, scale: number) => {
    made.flareScales.push(scale);
    return {
      moveTo() {},
      setLuminosity: (lumi: number) => made.lumis.push(lumi),
      setScale: (scale: number) => made.scales.push(scale),
      setAngle() {},
      dispose() {},
    };
  },
}));
vi.mock('@/controllers/fx/effectParticles', () => ({
  BonedParticleEmitter: class {
    constructor() {
      made.fires++;
    }
    update() {}
  },
}));
// A pillar scaled 1.3 whose bone 1 is posed up in its bowl.
vi.mock('@/controllers/terrain/mapTileObject', () => {
  const bone = { name: 'bone_1_Bone01', getAbsolutePosition: () => ({ x: 0, y: 2, z: 0 }) };
  return {
    MapTileObject: class {
      Ready = true;
      OutOfView = false;
      node = { scaling: { x: 1.3 }, getAbsolutePosition: () => ({ x: 0, y: 0, z: 0 }) };
      gltf = { skeleton: { bones: [{ getTransformNode: () => bone }] } };
      async init() {}
      Update() {}
      dispose() {}
    },
  };
});
vi.mock('@/ecs/current', () => ({ Ecs: { world: { scene: {} } } }));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { StadiumBrazierObject } = await import('./brazierObject');

const frame = { TotalGameTime: { TotalSeconds: 0 } } as World['gameTime'];

/** A brazier placed and loaded. */
async function placed() {
  // The mocked base takes no arguments.
  const brazier = new (StadiumBrazierObject as unknown as new () => InstanceType<typeof StadiumBrazierObject>)();
  await brazier.init({ scene: {} } as World, {} as Entity);
  return brazier;
}

describe('the Stadium brazier (type 9)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  // `Luminosity = (rand() % 30 + 70) * 0.01f` (:2737), `Scale = Luminosity * 5.f` (:2943), no `* o->Scale`.
  it('sizes its card Luminosity * 5 every frame on a scaled pillar (ZzzObject.cpp:2939-2946)', async () => {
    const brazier = await placed();
    brazier.Update(frame);
    await Promise.resolve();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    brazier.Update(frame);
    expect(made.flareScales).toEqual([5]);
    expect([made.scales.at(-1), made.lumis.at(-1)]).toEqual([expect.closeTo(4.25), expect.closeTo(0.85)]);
  });

  // The original draws the card alone: the fire in the bowl is ours.
  it('burns its fire on Enhanced (the lampFlares improvement), none on Classic', async () => {
    made.fires = 0;
    await placed();
    expect(made.fires).toBe(1);
    setFidelityChoice(FIDELITY_CLASSIC, {});
    await placed();
    expect(made.fires).toBe(1);
  });
});
