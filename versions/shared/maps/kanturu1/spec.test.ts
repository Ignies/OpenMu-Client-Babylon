import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';

describe('the Kanturu Ruins falls (GM_Kanturu_1st.cpp:187-202), on the GM area too (:44)', () => {
  // 81 `rand_fps_check(2)` WATERFALL_1 SubType 2, 82 every tick WATERFALL_3 SubType 4, 83 `rand_fps_check(3)`
  // WATERFALL_2 SubType 2, each white at `o->Scale`.
  it('make the original waterfall particles', () => {
    for (const world of [ENUM_WORLD.WD_37KANTURU_1ST, ENUM_WORLD.WD_40AREA_FOR_GM]) {
      expect(maps.emissionsFor(world, 81), ENUM_WORLD[world]).toEqual([{ kinds: ['waterfall1_2'], every: 2 }]);
      expect(maps.emissionsFor(world, 82), ENUM_WORLD[world]).toEqual([{ kinds: ['waterfall3_4'], every: 1 }]);
      expect(maps.emissionsFor(world, 83), ENUM_WORLD[world]).toEqual([{ kinds: ['waterfall2_2'], every: 3 }]);
    }
  });
});
