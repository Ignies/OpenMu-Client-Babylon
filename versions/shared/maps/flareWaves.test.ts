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
});
