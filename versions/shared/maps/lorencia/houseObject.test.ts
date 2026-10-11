import { describe, expect, it, vi } from 'vitest';
import { MODEL_HOUSE01 } from '../../objects/enum';

const swapped = vi.hoisted(() => ({ meshes: [] as number[] }));
vi.mock('@/controllers/render/modelObject', () => ({
  ModelObject: class {
    Type = 0;
    async loadSpecificModelWithDynamicID() {}
    getMesh(i: number) {
      return {
        set material(_m: unknown) {
          swapped.meshes.push(i);
        },
      };
    }
  },
}));
vi.mock('@/controllers/assets/modelLoader', () => ({ getMaterial: () => ({}) }));

const { HouseObject } = await import('./houseObject');

describe('the Lorencia houses (115-119)', () => {
  // `o->BlendMesh` (ZzzObject.cpp:4554-4561) is drawn by the shared blend path (the map's `blendMeshes`), which
  // `MoveObject`'s flicker and scroll write to (:3747-3753); a material of its own would hide both.
  it('leave their blend mesh to the map table', async () => {
    for (let type = MODEL_HOUSE01; type < MODEL_HOUSE01 + 5; type++) {
      // The mocked base takes no arguments.
      const house = new (HouseObject as unknown as new () => InstanceType<typeof HouseObject>)();
      house.Type = type;
      await house.init();
    }
    expect(swapped.meshes).toEqual([]);
  });
});
