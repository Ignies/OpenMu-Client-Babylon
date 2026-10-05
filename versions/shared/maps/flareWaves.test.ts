import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';

/** The cards a map object's light table draws. */
const cardsOf = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.filter(e => e.sprite) ?? [];

// The original's waves are `sinf(WorldTime * k)`, WorldTime in milliseconds: a card's wave takes its k.
describe('the map flare waves', () => {
  // `CreateSprite(BITMAP_LIGHT, o->Position, 2.0f * o->Scale, (1.0, 0.2, 0.0), o)`, no wave.
  it('fire vents burn steady red: Karutan 113, Loren Market 57, Vulcanus 6 (GMKarutan1.cpp:100-104, GMUnitedMarketPlace.cpp:296-300, GM_PK_Field.cpp:363-369)', () => {
    const vents: [ENUM_WORLD, number][] = [
      [ENUM_WORLD.WD_80KARUTAN1, 113],
      [ENUM_WORLD.WD_81KARUTAN2, 113],
      [ENUM_WORLD.WD_79UNITEDMARKETPLACE, 57],
      [ENUM_WORLD.WD_63PK_FIELD, 6],
      [ENUM_WORLD.WD_66DOPPLEGANGER2, 6],
    ];
    for (const [world, type] of vents) {
      expect(cardsOf(world, type).map(e => e.sprite), `world ${world} type ${type}`).toEqual([{ scale: 2, color: [1, 0.2, 0] }]);
    }
  });

  // `CreateSprite(BITMAP_LIGHT, bone 5, Luminosity + 0.2f, (0.6, 0.6, 1), o)`, `Luminosity = sinf(WorldTime * 0.001f) * 0.3f + 0.7f`.
  it('Kalima 12 and 32: the flower glow grows and shrinks on bone 5, unscaled (GMHellas.cpp:439-460)', () => {
    const glow = {
      offset: [-5, -1, 35],
      bone: true,
      sprite: { scale: 1, color: [0.6, 0.6, 1], grow: { speed: 0.001, amount: 0.3, base: 0.6 }, unscaled: true },
    };
    for (const world of [24, 25, 26, 27, 28, 29, 36] as ENUM_WORLD[]) {
      for (const type of [12, 32]) expect(cardsOf(world, type), `world ${world} type ${type}`).toEqual([glow]);
    }
  });
});
