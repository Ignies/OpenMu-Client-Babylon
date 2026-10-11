import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';
import type { World } from '@/ecs/world';
import { createBalgasBarracks } from './create';
import { createBalgasRefuge } from '../balgasrefuge/create';
import { BalgasSmokeObject } from './smokeObject';
import { BALGAS_TIMER_PUFFS } from './spec';

const WORLDS = [ENUM_WORLD.WD_41CHANGEUP3RD_1ST, ENUM_WORLD.WD_42CHANGEUP3RD_2ND];

describe('the Balgass lava vents (2)', () => {
  // `if (rand_fps_check(3)) CreateParticle(BITMAP_SMOKE, o->Position, o->Angle, (1, 1, 1), 13, o->Scale)`.
  it('puff one BITMAP_SMOKE SubType 13 a tick in three on both worlds (GM3rdChangeUp.cpp:119-125)', () => {
    for (const world of WORLDS) {
      expect(maps.emissionsFor(world, 2), ENUM_WORLD[world]).toEqual([{ kinds: ['smoke13'], every: 3 }]);
    }
  });
});

describe('Balgass 5 and 85, the timer smoke (GM3rdChangeUp.cpp:133-153, :187-210)', () => {
  // How the pairs alternate is `smokeObject.test.ts`; here, what each pair makes and that both worlds draw it.
  it('5 makes BITMAP_ADV_SMOKE + 1 with ADV_SMOKE SubType 0, then BITMAP_CLOUD SubType 6 with ADV_SMOKE SubType 1', () => {
    expect(BALGAS_TIMER_PUFFS[5]).toEqual([
      [{ kind: 'fi02_0' }, { kind: 'fi01_0' }],
      [{ kind: 'cloud6' }, { kind: 'fi01_1' }],
    ]);
  });

  // 85: on 2 (mod 4) `BITMAP_ADV_SMOKE + 1` SubType 1 behind one more `rand_fps_check(2)` and `BITMAP_ADV_SMOKE`
  // SubType 2, on 0 `BITMAP_CLOUD` SubType 14 and ADV_SMOKE SubType 2 at twice the scale.
  it('85 smokes as 5 does, with its own SubTypes', () => {
    expect(BALGAS_TIMER_PUFFS[85]).toEqual([
      [{ kind: 'fi02_1', coin: true }, { kind: 'fi01_2' }],
      [{ kind: 'cloud14' }, { kind: 'fi01_2', scale: 2 }],
    ]);
  });

  it('are drawn by BalgasSmokeObject on both worlds, and by no emission row', async () => {
    for (const create of [createBalgasBarracks, createBalgasRefuge]) {
      const tiles: unknown[] = [];
      await create({ terrain: { MapTileObjects: tiles } } as unknown as World);
      expect([tiles[5], tiles[85]]).toEqual([BalgasSmokeObject, BalgasSmokeObject]);
    }
    for (const world of WORLDS) {
      expect([maps.emissionsFor(world, 5), maps.emissionsFor(world, 85)], ENUM_WORLD[world]).toEqual([undefined, undefined]);
    }
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

describe('the volcano markers 88 and 89 (GM3rdChangeUp.cpp:211-221)', () => {
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
