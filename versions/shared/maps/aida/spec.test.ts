import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';

describe('the Aida falls (GMAida.cpp:167-184)', () => {
  // 56 `rand_fps_check(2)` WATERFALL_1 SubType 2, 57 every tick WATERFALL_3 SubType 4, 58 `rand_fps_check(3)`
  // WATERFALL_2 SubType 2, each white at `o->Scale`: Kanturu's three.
  it('make the original waterfall particles', () => {
    expect(maps.emissionsFor(ENUM_WORLD.WD_33AIDA, 56)).toEqual([{ kinds: ['waterfall1_2'], every: 2 }]);
    expect(maps.emissionsFor(ENUM_WORLD.WD_33AIDA, 57)).toEqual([{ kinds: ['waterfall3_4'], every: 1 }]);
    expect(maps.emissionsFor(ENUM_WORLD.WD_33AIDA, 58)).toEqual([{ kinds: ['waterfall2_2'], every: 3 }]);
  });
});
