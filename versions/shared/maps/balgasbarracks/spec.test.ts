import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';

describe('the Balgass lava vents (2)', () => {
  // `if (rand_fps_check(3)) CreateParticle(BITMAP_SMOKE, o->Position, o->Angle, (1, 1, 1), 13, o->Scale)`.
  it('puff one BITMAP_SMOKE SubType 13 a tick in three on both worlds (GM3rdChangeUp.cpp:119-125)', () => {
    for (const world of [ENUM_WORLD.WD_41CHANGEUP3RD_1ST, ENUM_WORLD.WD_42CHANGEUP3RD_2ND]) {
      expect(maps.emissionsFor(world, 2), ENUM_WORLD[world]).toEqual([{ kinds: ['smoke13'], every: 3 }]);
    }
  });
});
