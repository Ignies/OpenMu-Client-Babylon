import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';

// `if (rand_fps_check(3))` a BITMAP_LIGHT SubType 15 in (0.6, 0.8, 1.0) at `o->Scale`, made up to `o->Scale * 30` off
// in x and y (the kind's own spread): Doppelganger 1's 101 (GMDoppelGanger1.cpp:475-486), the others' 48
// (GMDoppelGanger2.cpp:532-543, GMDoppelGanger3.cpp:340-351, GMDoppelGanger4.cpp:387-398).
describe('the Doppelganger light boxes', () => {
  it('make BITMAP_LIGHT SubType 15 one tick in three on all four arenas', () => {
    const boxes: [ENUM_WORLD, number][] = [
      [ENUM_WORLD.WD_65DOPPLEGANGER1, 101],
      [ENUM_WORLD.WD_66DOPPLEGANGER2, 48],
      [ENUM_WORLD.WD_67DOPPLEGANGER3, 48],
      [ENUM_WORLD.WD_68DOPPLEGANGER4, 48],
    ];
    for (const [world, type] of boxes) {
      expect(maps.emissionsFor(world, type), ENUM_WORLD[world]).toEqual([
        { kinds: ['light15'], every: 3, light: [0.6, 0.8, 1] },
      ]);
    }
  });
});
