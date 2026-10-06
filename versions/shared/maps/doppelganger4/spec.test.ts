import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';

describe('Doppelganger 4 type 48', () => {
  // `if (rand_fps_check(3)) CreateParticle(BITMAP_LIGHT, vPos, o->Angle, (0.6, 0.8, 1.0), 15, o->Scale, o)`, `vPos` up
  // to `o->Scale * 30` off in x and y (the kind's own spread).
  it('makes a BITMAP_LIGHT SubType 15 one tick in three (GMDoppelGanger4.cpp:387-398)', () => {
    expect(maps.emissionsFor(ENUM_WORLD.WD_68DOPPLEGANGER4, 48)).toEqual([{ kinds: ['light15'], every: 3, light: [0.6, 0.8, 1] }]);
  });
});

describe('Doppelganger 4 type 59', () => {
  // `if (rand_fps_check(3)) CreateParticle(BITMAP_SMOKE, o->Position, o->Angle, (1, 1, 1), 13, o->Scale)`.
  it('puffs a BITMAP_SMOKE SubType 13 one tick in three, where Kanturu puffs SubType 21 (GMDoppelGanger4.cpp:399-405)', () => {
    expect(maps.emissionsFor(ENUM_WORLD.WD_68DOPPLEGANGER4, 59)).toEqual([{ kinds: ['smoke13'], every: 3 }]);
    expect(maps.emissionsFor(ENUM_WORLD.WD_37KANTURU_1ST, 59)).toEqual([{ kinds: ['smoke21'], every: 3 }]);
  });

  // 82 every tick WATERFALL_3 SubType 3 and 83 `rand_fps_check(3)` WATERFALL_2 SubType 1, where Kanturu makes SubType
  // 4 and 2; EncTerrain69.obj places neither.
  it('makes its own falls on 82 and 83 (GMDoppelGanger4.cpp:434-447)', () => {
    expect(maps.emissionsFor(ENUM_WORLD.WD_68DOPPLEGANGER4, 82)).toEqual([{ kinds: ['waterfall3_3'], every: 1 }]);
    expect(maps.emissionsFor(ENUM_WORLD.WD_68DOPPLEGANGER4, 83)).toEqual([{ kinds: ['waterfall2_1'], every: 3 }]);
  });

  it('keeps every other Kanturu row', () => {
    for (const type of [81, 97]) {
      expect(maps.emissionsFor(ENUM_WORLD.WD_68DOPPLEGANGER4, type), String(type)).toEqual(
        maps.emissionsFor(ENUM_WORLD.WD_37KANTURU_1ST, type)
      );
    }
  });
});
