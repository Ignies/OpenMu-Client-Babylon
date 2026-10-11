import { describe, expect, it, vi } from 'vitest';
import { MODEL_HOUSE_WALL01 } from '../../objects/enum';

vi.mock('@/controllers/render/modelObject', () => ({
  ModelObject: class {
    Type = 0;
    BlendMeshLightAt: ((ms: number) => number) | null = null;
    async loadSpecificModelWithDynamicID() {}
    Update() {}
  },
}));

const { HouseWallObject } = await import('./houseWallObject');

/** House Wall `n` (1-6) loaded. */
async function wall(n: number) {
  // The mocked base takes no arguments.
  const object = new (HouseWallObject as unknown as new () => InstanceType<typeof HouseWallObject>)();
  object.Type = MODEL_HOUSE_WALL01 + n - 1;
  await object.init();
  return object;
}

describe('the Lorencia house walls (121-126)', () => {
  // `o->BlendMeshLight = (float)(rand() % 4 + 4) * 0.1f` every MoveObject (ZzzObject.cpp:3752-3754), on the
  // BlendMesh 4 it is made with (:4563-4564): 0.4 to 0.7 in tenths, a fresh roll every frame.
  it('flicker House Wall 02 a fresh tenth from 0.4 to 0.7 every frame', async () => {
    const light = (await wall(2)).BlendMeshLightAt;
    const roll = vi.spyOn(Math, 'random');
    for (const [r, lumi] of [[0, 0.4], [0.3, 0.5], [0.6, 0.6], [0.9999, 0.7]]) {
      roll.mockReturnValueOnce(r);
      expect(light?.(1000)).toBeCloseTo(lumi);
    }
    roll.mockRestore();
  });

  it('leave the other walls steady', async () => {
    for (const n of [1, 3, 4, 5, 6]) expect((await wall(n)).BlendMeshLightAt).toBeNull();
  });
});
