import { describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';

// How many scrolls `perTick` has built.
const built = vi.hoisted(() => ({ scrolls: 0 }));
vi.mock('../shared/meshAnimation', async original => {
  const real = await original<typeof import('../shared/meshAnimation')>();
  return { ...real, perTick: (k: number) => (built.scrolls++, real.perTick(k)) };
});

// The test setup has loaded every map already: load this one again over the counting `perTick`.
vi.resetModules();
const { AIDA_MESH_ANIMATIONS } = await import('./spec');

describe('the Aida scrolls (GMAida.cpp:47-56)', () => {
  // `BlendMeshTexCoordV -= 0.015f` every tick, read every frame from a scroll built once, not one a frame.
  it('run 25 and 28 down 0.015 a tick', () => {
    const before = built.scrolls;
    for (const type of [25, 28]) {
      expect(AIDA_MESH_ANIMATIONS[type]?.v?.(400)).toBeCloseTo(-0.15);
      expect(AIDA_MESH_ANIMATIONS[type]?.v?.(800)).toBeCloseTo(-0.3);
    }
    expect(built.scrolls).toBe(before);
  });
});

describe('the Aida falls (GMAida.cpp:167-184)', () => {
  // 56 `rand_fps_check(2)` WATERFALL_1 SubType 2, 57 every tick WATERFALL_3 SubType 4, 58 `rand_fps_check(3)`
  // WATERFALL_2 SubType 2, each white at `o->Scale`: Kanturu's three.
  it('make the original waterfall particles', () => {
    expect(maps.emissionsFor(ENUM_WORLD.WD_33AIDA, 56)).toEqual([{ kinds: ['waterfall1_2'], every: 2 }]);
    expect(maps.emissionsFor(ENUM_WORLD.WD_33AIDA, 57)).toEqual([{ kinds: ['waterfall3_4'], every: 1 }]);
    expect(maps.emissionsFor(ENUM_WORLD.WD_33AIDA, 58)).toEqual([{ kinds: ['waterfall2_2'], every: 3 }]);
  });
});
