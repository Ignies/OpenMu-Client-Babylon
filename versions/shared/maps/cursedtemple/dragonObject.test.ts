import { describe, expect, it, vi } from 'vitest';
import { Matrix } from '@/controllers/render/babylon/exports';
import { ENUM_WORLD } from '@/core/types';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';
import type { Entity, World } from '@/ecs/world';

// Every card the dragon asked for, and what it last did with each.
type Asked = { scale: number; color: readonly number[]; texture?: string; at?: number[]; size?: number };
const flares = vi.hoisted(() => [] as Asked[]);

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async (_scene: unknown, scale: number, color: readonly number[], texture?: string) => {
    const asked: Asked = { scale, color, texture };
    flares.push(asked);
    return {
      moveTo: (x: number, y: number, z: number) => void (asked.at = [x, y, z]),
      setScale: (size: number) => void (asked.size = size),
      dispose() {},
    };
  },
}));
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    static Batchable = true;
    async init() {}
    Update() {}
    dispose() {}
  },
}));
// Bone 22 sits at (1, 2, 3) and bone 23 at (4, 5, 6), unturned; `head` moves both.
const head = vi.hoisted(() => ({ x: 0 }));
vi.mock('../bloodcastle/bones', () => ({
  findBone: (_object: unknown, index: number) => {
    const world = Matrix.Identity();
    const pose = () => Matrix.TranslationToRef(...((index === 22 ? [1, 2, 3] : [4, 5, 6]).map((v, i) => (i ? v : v + head.x)) as [number, number, number]), world);
    return { computeWorldMatrix: () => (pose(), world), getWorldMatrix: () => world };
  },
}));
vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

const { CursedTempleDragonObject } = await import('./dragonObject');

describe('the Cursed Temple dragon (type 62)', () => {
  // `CreateSprite(BITMAP_SHINY + 1, vPos, 1.5f + fLumi / 2.f, (1, 0.5, 0.5), NULL)` at bones 22 and 23 + (6, +-5, 2),
  // `fLumi = sinf(WorldTime * 0.001f) * 0.5f + 0.5f`, every frame (ZzzObject.cpp:684-696).
  it('hangs its two pink Shiny02 eyes on bones 22 and 23 every frame, growing with fLumi', async () => {
    // The mocked base takes no arguments.
    const dragon = new (CursedTempleDragonObject as unknown as new () => InstanceType<typeof CursedTempleDragonObject>)();
    await dragon.init({ scene: {} } as World, {} as Entity);
    dragon.Update({ TotalGameTime: { TotalSeconds: 5 } } as World['gameTime']);
    expect(flares.map(f => [f.color, f.texture])).toEqual([
      [[1, 0.5, 0.5], 'shiny1'],
      [[1, 0.5, 0.5], 'shiny1'],
    ]);
    // The nudges in each bone's frame, a hundredth of a tile per unit.
    expect(flares.map(f => f.at)).toEqual([
      [1.06, 2.05, 3.02].map(v => expect.closeTo(v)),
      [4.06, 4.95, 6.02].map(v => expect.closeTo(v)),
    ]);
    const size = 1.5 + (Math.sin(5) * 0.5 + 0.5) / 2;
    expect(flares.map(f => f.size)).toEqual([size, size].map(v => expect.closeTo(v)));

    // The head swings: the eyes go with it the next frame.
    head.x = 1.38;
    dragon.Update({ TotalGameTime: { TotalSeconds: 5.04 } } as World['gameTime']);
    expect(flares.map(f => f.at?.[0])).toEqual([2.44, 5.44].map(v => expect.closeTo(v)));
  });

  it('is its own object, not a batched prop, and no table card sits at the middle of the swing', () => {
    expect(CursedTempleDragonObject.Batchable).toBe(false);
    for (let world = ENUM_WORLD.WD_45CURSEDTEMPLE_LV1; world <= ENUM_WORLD.WD_45CURSEDTEMPLE_LV6; world++) {
      expect(lightEmittersFor(world, 62), `world ${world}`).toBeUndefined();
    }
  });
});
