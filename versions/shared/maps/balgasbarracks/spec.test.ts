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

describe('Balgass 58-60 (GM3rdChangeUp.cpp:173-186)', () => {
  // 58 `rand_fps_check(2)` WATERFALL_1 SubType 2, 59 `rand_fps_check(3)` WATERFALL_2 SubType 1, 60 every tick
  // WATERFALL_3 SubType 3, each at `o->Scale`, white.
  it('make the original waterfall particles', () => {
    for (const world of WORLDS) {
      expect(maps.emissionsFor(world, 58), ENUM_WORLD[world]).toEqual([{ kinds: ['waterfall1_2'], every: 2 }]);
      expect(maps.emissionsFor(world, 59), ENUM_WORLD[world]).toEqual([{ kinds: ['waterfall2_1'], every: 3 }]);
      expect(maps.emissionsFor(world, 60), ENUM_WORLD[world]).toEqual([{ kinds: ['waterfall3_3'], every: 1 }]);
    }
  });
});

describe('the volcano markers 85, 88 and 89 (GM3rdChangeUp.cpp:187-221)', () => {
  // 85 walks `o->Timer` as 5 does: on 2 (mod 4) `BITMAP_ADV_SMOKE + 1` SubType 1 behind one more `rand_fps_check(2)`
  // and `BITMAP_ADV_SMOKE` SubType 2, on 0 `BITMAP_CLOUD` SubType 14 and ADV_SMOKE SubType 2 at twice the scale.
  it('85 smokes as 5 does, with its own SubTypes', () => {
    for (const world of WORLDS) {
      expect(maps.emissionsFor(world, 85), ENUM_WORLD[world]).toEqual([
        { kinds: ['fi02_1'], every: 16 },
        { kinds: ['fi01_2'], every: 8 },
        { kinds: ['cloud14'], every: 8 },
        { kinds: ['fi01_2'], every: 8, scale: 2 },
      ]);
    }
  });

  // 88 `rand_fps_check(4)` CLOUD SubType 10; 89 `rand_fps_check(4)` CLOUD SubType 11 in `((rand() % 3) * 0.01 + 0.015, 0, 0)`.
  it('88 and 89 drift BITMAP_CLOUD SubType 10 and 11 one tick in four, 89 a faint red', () => {
    for (const world of WORLDS) {
      expect(maps.emissionsFor(world, 88), ENUM_WORLD[world]).toEqual([{ kinds: ['cloud10'], every: 4 }]);
      const [ember] = maps.emissionsFor(world, 89) ?? [];
      expect([ember?.kinds, ember?.every], ENUM_WORLD[world]).toEqual([['cloud11'], 4]);
      const reds = new Set<string>();
      for (let n = 0; n < 200; n++) {
        const light = typeof ember?.light === 'function' ? ember.light() : ember?.light;
        reds.add(light?.map(c => c.toFixed(3)).join(' ') ?? 'none');
      }
      expect([...reds].sort()).toEqual(['0.015 0.000 0.000', '0.025 0.000 0.000', '0.035 0.000 0.000']);
    }
  });
});
