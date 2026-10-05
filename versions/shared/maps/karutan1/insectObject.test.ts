import { describe, expect, it, vi } from 'vitest';
import { Matrix } from '@/controllers/render/babylon/exports';
import type { Entity, World } from '@/ecs/world';

// Every flare the insect asked for, and what it last did with each.
type Asked = { scale: number; color: readonly number[]; texture?: string; at?: number[]; lumi?: number };
const flares = vi.hoisted(() => [] as Asked[]);

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async (_scene: unknown, scale: number, color: readonly number[], texture?: string) => {
    const asked: Asked = { scale, color, texture };
    flares.push(asked);
    return {
      moveTo: (x: number, y: number, z: number) => void (asked.at = [x, y, z]),
      setLuminosity: (lumi: number) => void (asked.lumi = lumi),
      dispose() {},
    };
  },
}));
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    static Batchable = true;
    Ready = true;
    OutOfView = false;
    CurrentAction = 0;
    node = { scaling: { x: 1.54 } };
    async init() {}
    Update() {}
    dispose() {}
    setAnimationSpeed() {}
    actionFrame() {
      return 0;
    }
    playAction() {}
  },
}));
// Bone 13 sits at (1, 2, 3) and bone 14 at (4, 5, 6), unturned.
vi.mock('../bloodcastle/bones', () => ({
  findBone: (_object: unknown, index: number) => {
    const world = index === 13 ? Matrix.Translation(1, 2, 3) : Matrix.Translation(4, 5, 6);
    return { computeWorldMatrix: () => world, getWorldMatrix: () => world };
  },
}));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { KarutanInsectObject } = await import('./insectObject');

describe('the Karutan insect (type 66)', () => {
  // `flumi = absf(sinf(WorldTime * 0.0004)) * 0.4f`, two BITMAP_SHINY + 5 at 1.2, no `* o->Scale` (GMKarutan1.cpp:68-82).
  it('glows on bones 13 and 14 from the BITMAP_SHINY + 5 sheet, |sin| breathing', async () => {
    // The mocked base takes no arguments.
    const insect = new (KarutanInsectObject as unknown as new () => InstanceType<typeof KarutanInsectObject>)();
    await insect.init({ scene: {} } as World, {} as Entity);
    insect.Update({ TotalGameTime: { TotalSeconds: 5 } } as World['gameTime']);
    expect(flares.map(f => [f.scale, f.color, f.texture])).toEqual([
      [1.2, [1.9, 1.1, 1.1], 'shiny5'],
      [1.2, [1.9, 1.1, 1.1], 'shiny5'],
    ]);
    // The original's nudges, (10, 0, -6) and (10, 0, 6) in each bone's frame, a hundredth of a tile per unit.
    expect(flares.map(f => f.at)).toEqual([
      [1.1, 2, 2.94].map(v => expect.closeTo(v)),
      [4.1, 5, 6.06].map(v => expect.closeTo(v)),
    ]);
    expect(flares.map(f => f.lumi)).toEqual([0, 1].map(() => expect.closeTo(Math.abs(Math.sin(2)) * 0.4)));
  });

  it('is its own object, not a batched prop: it plays its own clip and carries the glow', () => {
    expect(KarutanInsectObject.Batchable).toBe(false);
  });
});
