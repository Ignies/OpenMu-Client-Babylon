import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';

/** A map object's flare card: the one row of its light table that draws one. */
const flareOf = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.find(e => e.sprite);

/** Every card a map object draws. */
const cardsOf = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.filter(e => e.sprite) ?? [];

describe('the Aida plant sparks', () => {
  // Bones 6, 7, 8, 12, 13, 17 (their sway's middle, at scale 1): a big tinted spark and a 3.0 one at each.
  const BONES = [[32, 2, 54], [32, 1, 41], [32, 0, 26], [-24, 9, 46], [-23, 5, 31], [-10, -22, 59]];

  it('30: twelve BITMAP_SPARK + 1 cards, blue over grey, sized without the object scale (GMAida.cpp:106-150)', () => {
    const cards = cardsOf(ENUM_WORLD.WD_33AIDA, 30);
    expect(cards.map(e => e.offset)).toEqual(BONES.flatMap(b => [b, b]));
    expect(cards.map(e => e.sprite?.scale)).toEqual([5.5, 3, 4.5, 3, 4, 3, 4.5, 3, 4, 3, 4, 3]);
    expect(cards.map(e => e.sprite?.color.join(' '))).toEqual(Array(6).fill(['0.1 0.1 0.3', '0.15 0.15 0.15']).flat());
    expect(cards.every(e => e.bone && e.sprite?.texture === 'spark1' && e.sprite.unscaled)).toBe(true);
  });

  it('71: the same rig on the red crystals (GMAida.cpp:259-303)', () => {
    const cards = cardsOf(ENUM_WORLD.WD_33AIDA, 71);
    expect(cards.map(e => e.offset)).toEqual(BONES.flatMap(b => [b, b]));
    expect(cards.map(e => e.sprite?.scale)).toEqual([6, 3, 5.5, 3, 5, 3, 5.5, 3, 5, 3, 5, 3]);
    expect(cards.map(e => e.sprite?.color.join(' '))).toEqual(
      ['0.5 0 0', ...Array(5).fill('0.25 0 0')].flatMap(big => [big, '0.15 0 0'])
    );
    expect(cards.every(e => e.bone && e.sprite?.texture === 'spark1' && e.sprite.unscaled)).toBe(true);
  });
});

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
