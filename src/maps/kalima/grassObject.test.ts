import { describe, expect, it, vi } from 'vitest';
import { PlayerAction } from '../../common/objects/enum';

const seam = vi.hoisted(() => ({ kalimabob: null as string | null }));
const store = vi.hoisted(() => ({ world: null as unknown }));

// Only the plant's own Update is under test: the model, the store and the
// wave field are stubbed.
vi.mock('../../common/devSeams', () => ({
  devQuery: (key: string) => (key === 'kalimabob' ? seam.kalimabob : null),
}));
vi.mock('../../common/mapTileObject', () => ({
  MapTileObject: class {
    Ready = true;
    OutOfView = false;
    WorldIndex = 0;
    async init() {}
    dispose() {}
    Update() {}
  },
}));
vi.mock('../../libs/mu/terrainWater', () => ({
  waterSurfaceHeight: (x: number, z: number, t: number) => Math.sin(x + z + t),
}));
vi.mock('../../store', () => ({
  Store: {
    get world() {
      return store.world;
    },
  },
}));

const WATER_SURFACE = 3.55;
const PLANT = { x: 10, z: 20 };
const HERO_X = 10.1;

function pinned(x: number, z: number, t: number): number {
  return WATER_SURFACE + 0.5 * Math.sin(x + z + t);
}

/** One `CheckGrass` tick with the hero in range: arm at 0.6, decay at 0.6. */
function pushedOnce(x: number): number {
  return x - 0.36 * (HERO_X - x);
}

async function plant(kalimabob: string | null) {
  seam.kalimabob = kalimabob;
  vi.resetModules();
  const { KalimaWaterPlantObject } = await import('./grassObject');

  const transform = { pos: { x: PLANT.x, y: 0, z: PLANT.z } };
  const object = new KalimaWaterPlantObject({} as never);
  await object.init({} as never, { transform } as never);

  const update = (t: number) =>
    object.Update({ TotalGameTime: { TotalSeconds: t } });

  return { object, pos: transform.pos, update };
}

function walkingHeroBesideThePlant() {
  store.world = {
    playerEntity: {
      worldIndex: 0,
      playerAnimation: { action: PlayerAction.PLAYER_WALK_MALE },
      transform: { pos: { x: HERO_X, y: 0, z: PLANT.z } },
    },
  };
}

describe('KalimaWaterPlantObject', () => {
  it('pins an in-view plant to the water every frame', async () => {
    store.world = null;
    const { pos, update } = await plant(null);

    for (const t of [1, 1.3, 2.7]) {
      update(t);
      expect(pos.y).toBe(pinned(PLANT.x, PLANT.z, t));
    }
  });

  it('leaves an off-screen plant alone and re-pins it on the frame it returns', async () => {
    store.world = null;
    const { object, pos, update } = await plant(null);

    update(1);
    const held = pos.y;

    object.OutOfView = true;
    for (const t of [1.5, 2, 2.5]) {
      update(t);
      expect(pos.y).toBe(held);
    }

    object.OutOfView = false;
    update(3.25);
    expect(pos.y).toBe(pinned(PLANT.x, PLANT.z, 3.25));
  });

  it('does not push off screen and steps one tick, not a burst, on return', async () => {
    walkingHeroBesideThePlant();
    const { object, pos, update } = await plant(null);

    // 1.75 ticks: one push, three quarters of a tick left owing.
    update(0);
    update(0.07);
    const afterFirst = pushedOnce(PLANT.x);
    expect(pos.x).toBeCloseTo(afterFirst, 12);

    object.OutOfView = true;
    for (const t of [0.5, 1, 4]) update(t);
    expect(pos.x).toBe(afterFirst);
    expect(pos.z).toBe(PLANT.z);

    // 1.75 ticks again; the gap was clamped and spent, so nothing is owed.
    object.OutOfView = false;
    update(4.07);
    expect(pos.x).toBeCloseTo(pushedOnce(afterFirst), 12);
  });

  it('keeps the tick phase across hidden frames', async () => {
    walkingHeroBesideThePlant();
    const { object, pos, update } = await plant(null);

    // 1.5625 ticks: one push, 0.5625 left.
    update(0);
    update(0.0625);
    const afterFirst = pushedOnce(PLANT.x);
    expect(pos.x).toBeCloseTo(afterFirst, 12);

    // 0.78125 more: a tick falls due while hidden and is spent, 0.34375 left.
    object.OutOfView = true;
    update(0.09375);
    expect(pos.x).toBe(afterFirst);

    // 0.78125 more reaches 1.125: the old path's next tick lands on this frame.
    object.OutOfView = false;
    update(0.125);
    expect(pos.x).toBeCloseTo(pushedOnce(afterFirst), 12);
  });

  it('?kalimabob=0 pins and pushes off-screen plants as before', async () => {
    walkingHeroBesideThePlant();
    const { object, pos, update } = await plant('0');

    update(0);
    object.OutOfView = true;
    update(0.07);

    expect(pos.x).toBeCloseTo(pushedOnce(PLANT.x), 12);
    expect(pos.y).toBe(pinned(pos.x, PLANT.z, 0.07));
  });
});
