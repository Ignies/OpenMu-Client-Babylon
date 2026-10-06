import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';

const WORLDS = [ENUM_WORLD.WD_41CHANGEUP3RD_1ST, ENUM_WORLD.WD_42CHANGEUP3RD_2ND];

describe('the Balgass lava vents (2)', () => {
  // `if (rand_fps_check(3)) CreateParticle(BITMAP_SMOKE, o->Position, o->Angle, (1, 1, 1), 13, o->Scale)`.
  it('puff one BITMAP_SMOKE SubType 13 a tick in three on both worlds (GM3rdChangeUp.cpp:119-125)', () => {
    for (const world of WORLDS) {
      expect(maps.emissionsFor(world, 2), ENUM_WORLD[world]).toEqual([{ kinds: ['smoke13'], every: 3 }]);
    }
  });
});

describe('Balgass 5 (GM3rdChangeUp.cpp:133-153)', () => {
  it('makes BITMAP_ADV_SMOKE + 1 with ADV_SMOKE SubType 0, and BITMAP_CLOUD SubType 6 with ADV_SMOKE SubType 1, each pair one tick in eight', () => {
    for (const world of WORLDS) {
      expect(maps.emissionsFor(world, 5), ENUM_WORLD[world]).toEqual([
        { kinds: ['fi02_0'], every: 8 },
        { kinds: ['fi01_0'], every: 8 },
        { kinds: ['cloud6'], every: 8 },
        { kinds: ['fi01_1'], every: 8 },
      ]);
    }
  });

  // Each `rand_fps_check(2)` that passes steps `o->Timer`; the first pair needs its own step to land on
  // 2 (mod 4), the second on 0: the residues are even, so each pair comes one tick in eight.
  it('one tick in eight is the rate of the original timer', () => {
    let timer = 0;
    let first = 0;
    let second = 0;
    const ticks = 400_000;

    for (let t = 0; t < ticks; t++) {
      if (Math.random() < 0.5 && (++timer + 2) % 4 === 0) first++;
      if (Math.random() < 0.5 && ++timer % 4 === 0) second++;
    }

    expect(first / ticks).toBeCloseTo(1 / 8, 2);
    expect(second / ticks).toBeCloseTo(1 / 8, 2);
  });
});
