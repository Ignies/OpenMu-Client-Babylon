import { describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '@/ecs/world';

// The glow's flare: what it was made of and what it was last set to.
type Asked = { scale: number; color: readonly number[]; texture?: string; size?: number; lumi?: number };
const flares = vi.hoisted(() => [] as Asked[]);

vi.mock('@/controllers/lighting/effectLights', () => ({
  createMovableFlare: async (_scene: unknown, scale: number, color: readonly number[], texture?: string) => {
    const asked: Asked = { scale, color, texture };
    flares.push(asked);
    return {
      moveTo() {},
      setScale: (size: number) => void (asked.size = size),
      setLuminosity: (lumi: number) => void (asked.lumi = lumi),
      dispose() {},
    };
  },
}));
vi.mock('@/controllers/terrain/mapTileObject', () => ({
  MapTileObject: class {
    node = { scaling: { x: 1.55 }, position: { x: 0, y: 0, z: 0 } };
    gltf = { mesh: { getDescendants: () => [] } };
    async init() {}
    Update() {}
    dispose() {}
  },
}));
vi.mock('@/controllers/render/modelObject', () => ({ HIDDEN_MESH_ALL: -2 }));

const { TarkanImpactGlowObject } = await import('./impactGlowObject');

describe('the Tarkan impact glow (type 63)', () => {
  // `L = sin((WorldTime + Angle * 5) * 0.002) * 0.3 + 0.7`, `CreateSprite(BITMAP_IMPACT, Position, L * 1.5f,
  // (L / 1.7, L, L))`: the size and the colour breathe together, and no `* o->Scale` (ZzzObject.cpp:2964-2971).
  it('draws BITMAP_IMPACT at L * 1.5 across in (L / 1.7, L, L)', async () => {
    // The mocked base takes no arguments.
    const glow = new (TarkanImpactGlowObject as unknown as new () => InstanceType<typeof TarkanImpactGlowObject>)();
    await glow.init({ scene: {} } as World, { transform: { rot: { y: 0 } } } as Entity);
    const [flare] = flares;
    expect([flare.texture, flare.color]).toEqual(['impact', [1 / 1.7, 1, 1]]);
    glow.Update({ TotalGameTime: { TotalSeconds: Math.PI / 2 / 2 } } as World['gameTime']);
    expect([flare.size, flare.lumi]).toEqual([1.5, 1].map(v => expect.closeTo(v)));
    glow.Update({ TotalGameTime: { TotalSeconds: (Math.PI * 3) / 2 / 2 } } as World['gameTime']);
    expect([flare.size, flare.lumi]).toEqual([0.6, 0.4].map(v => expect.closeTo(v)));
  });
});
