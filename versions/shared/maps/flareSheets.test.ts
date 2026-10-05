import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';

/** A map object's flare card: the one row of its light table that draws one. */
const flareOf = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.find(e => e.sprite);

// BITMAP_FLARE is Flare.jpg, a warm star (ZzzOpenData.cpp:5309): the tint is the original's, not a warm stand-in.
describe('the map flares the original draws as BITMAP_FLARE', () => {
  it('Aida 75: white, 3 (GMAida.cpp:304-311)', () => {
    expect(flareOf(ENUM_WORLD.WD_33AIDA, 75)?.sprite).toEqual({ scale: 3, color: [1, 1, 1], texture: 'flare' });
  });

  it('Crywolf 41: white, 1.3, 350-370 up (GMCrywolf1st.cpp:395-414)', () => {
    expect(flareOf(ENUM_WORLD.WD_34CRYWOLF_1ST, 41)).toEqual({
      offset: [0, 0, 360],
      sprite: { scale: 1.3, color: [1, 1, 1], texture: 'flare' },
    });
  });

  it('Loren Market 30 and 35: grey, breathing like their fLumi (GMUnitedMarketPlace.cpp:248-274)', () => {
    expect(flareOf(ENUM_WORLD.WD_79UNITEDMARKETPLACE, 30)?.sprite).toEqual({
      scale: 1.5,
      color: [0.5, 0.5, 0.5],
      pulse: { speed: 0.002, amount: 0.2, base: 0.6 },
      texture: 'flare',
    });
    expect(flareOf(ENUM_WORLD.WD_79UNITEDMARKETPLACE, 35)?.sprite).toEqual({
      scale: 1.5,
      color: [0.7, 0.7, 0.7],
      pulse: { speed: 0.039, amount: 0.2, base: 0.6 },
      texture: 'flare',
    });
  });
});
