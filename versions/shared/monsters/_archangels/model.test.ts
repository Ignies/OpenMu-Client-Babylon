import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { Entity, World } from '@/ecs/world';

// The halo's draw calls, as (x, z, size, rotationDeg).
const draws = vi.hoisted(() => [] as number[][]);

vi.mock('@/controllers/fx', () => ({
  TEX: { magicGround2: 'Effect/Magic_Ground2.OZJ' },
  effects: { spawn: () => {} },
  TerrainDecal: class {
    draw(_world: unknown, x: number, z: number, size: number, rotationDeg: number) {
      draws.push([x, z, size, rotationDeg]);
    }
    hide() {}
    dispose() {}
  },
}));

vi.mock('@/controllers/assets', () => ({ loadGLTF: async () => null }));

vi.mock('@/controllers/actors', () => ({
  ModelObject: class {
    static OverrideScale = 0;
    Ready = true;
    OutOfView = false;
    node = { forward: { x: 0, y: 0, z: 1 } };
    async init() {}
    load() {}
    Update() {}
    dispose() {}
  },
  npcModelFile: (file: string) => file,
  registerModelClass: () => {},
}));

import { Archangel } from './model';

const world = { isWalkable: () => true, scene: {} } as unknown as World;
const gameTime = { TotalGameTime: { TotalSeconds: 1 } } as World['gameTime'];

/** The halo's rotation for an angel facing `yawDeg` (`o->Angle[2]`). */
async function haloRotation(yawDeg: number, visualDeg?: number): Promise<number> {
  const rad = (d: number) => (d * Math.PI) / 180;
  const entity = {
    transform: {
      pos: { x: 10, y: 0, z: 20 },
      rot: { x: 0, y: rad(yawDeg), z: 0 },
      scale: 1,
      visualRotY: visualDeg === undefined ? undefined : rad(visualDeg),
    },
  } as unknown as Entity;
  // The mocked base takes no arguments.
  const angel = new (Archangel as unknown as new () => InstanceType<typeof Archangel>)();
  await angel.init(world, entity);
  draws.length = 0;
  angel.Update(gameTime);
  return draws[0][3];
}

describe('the archangel halo', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  // RenderTerrainAlphaBitmap(..., -o->Angle[2]) (ZzzCharacter.cpp:8704).
  it('turns with the angel by -Angle[2] on every preset', async () => {
    expect(await haloRotation(90)).toBeCloseTo(-90);
    expect(await haloRotation(225)).toBeCloseTo(-225);
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(await haloRotation(90)).toBeCloseTo(-90);
  });

  it('follows the rendered (smoothed) facing while the angel turns', async () => {
    expect(await haloRotation(90, 45)).toBeCloseTo(-45);
  });
});
