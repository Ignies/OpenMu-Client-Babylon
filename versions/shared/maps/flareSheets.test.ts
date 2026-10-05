import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';

/** A map object's flare card: the one row of its light table that draws one. */
const flareOf = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.find(e => e.sprite);

/** Every card a map object draws. */
const cardsOf = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.filter(e => e.sprite) ?? [];

describe('the BITMAP_SPARK + 1 cards (Spark03.jpg)', () => {
  // Aida's bulbs, bones 6, 7, 8, 12, 13, 17 (their sway's middle, at scale 1): a big tinted spark and a 3.0 one at each.
  const BONES = [[32, 2, 54], [32, 1, 41], [32, 0, 26], [-24, 9, 46], [-23, 5, 31], [-10, -22, 59]];

  it('Aida 30: twelve on the plant bulbs, blue over grey, sized without the object scale (GMAida.cpp:106-150)', () => {
    const cards = cardsOf(ENUM_WORLD.WD_33AIDA, 30);
    expect(cards.map(e => e.offset)).toEqual(BONES.flatMap(b => [b, b]));
    expect(cards.map(e => e.sprite?.scale)).toEqual([5.5, 3, 4.5, 3, 4, 3, 4.5, 3, 4, 3, 4, 3]);
    expect(cards.map(e => e.sprite?.color.join(' '))).toEqual(Array(6).fill(['0.1 0.1 0.3', '0.15 0.15 0.15']).flat());
    expect(cards.every(e => e.bone && e.sprite?.texture === 'spark1' && e.sprite.unscaled)).toBe(true);
  });

  it('Aida 71: the same rig on the red crystals (GMAida.cpp:259-303)', () => {
    const cards = cardsOf(ENUM_WORLD.WD_33AIDA, 71);
    expect(cards.map(e => e.offset)).toEqual(BONES.flatMap(b => [b, b]));
    expect(cards.map(e => e.sprite?.scale)).toEqual([6, 3, 5.5, 3, 5, 3, 5.5, 3, 5, 3, 5, 3]);
    expect(cards.map(e => e.sprite?.color.join(' '))).toEqual(
      ['0.5 0 0', ...Array(5).fill('0.25 0 0')].flatMap(big => [big, '0.15 0 0'])
    );
    expect(cards.every(e => e.bone && e.sprite?.texture === 'spark1' && e.sprite.unscaled)).toBe(true);
  });

  // `Luminosity = sinf(WorldTime * 0.002f) + 1.8f` sizes both; Doppelganger 4 and the GM area read this table.
  it('Kanturu 70: two on bone 6 that grow and shrink (GM_Kanturu_1st.cpp:175-186)', () => {
    const grow = { speed: 0.002, amount: 1, base: 0.8 };
    const card = (scale: number, color: number[]) => ({
      offset: [0, -1, 200],
      bone: true,
      sprite: { scale, color, grow, texture: 'spark1', unscaled: true },
    });
    expect(cardsOf(ENUM_WORLD.WD_37KANTURU_1ST, 70)).toEqual([card(7, [0.8, 0.4, 0.2]), card(4, [0.65, 0.65, 0.65])]);
  });

  // `flumi = absf(sinf(WorldTime * 0.0004)) * 0.4f` tints `(1.3, 1.3, 1.9)`; the 1.5 sparks are a steady 0.15 grey.
  it('Karutan 72: three on bones 11 and 7 with a BITMAP_LIGHT, breathing on |sin| (GMKarutan1.cpp:83-99)', () => {
    const flumi = { speed: 0.0004, amount: 0.4, base: 0, abs: true };
    const card = (offset: number[], scale: number, texture?: string) => ({
      offset,
      bone: true,
      sprite: { scale, color: [1.3, 1.3, 1.9], pulse: flumi, texture, unscaled: true },
    });
    const grey = (offset: number[]) => ({
      offset,
      bone: true,
      sprite: { scale: 1.5, color: [0.15, 0.15, 0.15], texture: 'spark1', unscaled: true },
    });
    // Bones 11 and 7 + (20, 0, 0), at the middle of their sway.
    const [b11, b7] = [[24, -18, 207], [-153, -34, 151]];
    for (const world of [ENUM_WORLD.WD_80KARUTAN1, ENUM_WORLD.WD_81KARUTAN2]) {
      expect(cardsOf(world, 72)).toEqual([card(b11, 2), grey(b11), card(b7, 4, 'spark1'), grey(b7)]);
    }
  });

  // `fLumi = (sinf(WorldTime * 0.001f) + 1.0f) * 0.5f` on all three channels, 10 across; bone 4 rides 21-151 up.
  it('Kanturu 2 8: one on bone 4, white breathing up from black (GM_Kanturu_2nd.cpp:347-371)', () => {
    expect(cardsOf(ENUM_WORLD.WD_38KANTURU_2ND, 8)).toEqual([
      {
        offset: [0, 0, 94],
        bone: true,
        sprite: {
          scale: 10,
          color: [1, 1, 1],
          pulse: { speed: 0.001, amount: 0.5, base: 0 },
          texture: 'spark1',
          unscaled: true,
        },
      },
    ]);
  });
});

describe('the BITMAP_KANTURU_2ND_EFFECT1 cards (k_effect_01.jpg)', () => {
  // `CreateSprite(BITMAP_KANTURU_2ND_EFFECT1, Position, fLumi / 3.2, Light, o)` twice over the BITMAP_LIGHT.
  it('Kanturu 2 4: two on bone 1 that breathe and grow with fLumi (GM_Kanturu_2nd.cpp:335-346)', () => {
    const fLumi = { speed: 0.002, amount: 0.5, base: 0.5 };
    const card = {
      offset: [0, 13, 244],
      bone: true,
      sprite: { scale: 1 / 3.2, color: [0.3, 0.5, 1], pulse: fLumi, grow: fLumi, unscaled: true, texture: 'kanturu2ndEffect1' },
    };
    expect(cardsOf(ENUM_WORLD.WD_38KANTURU_2ND, 4).filter(e => e.sprite?.texture)).toEqual([card, card]);
  });
});

describe('the BITMAP_SHINY + 5 cards (shiny05.jpg)', () => {
  // Its two points ride bones that sweep 1.4 tiles: the insect hangs them itself (karutan1/insectObject.test.ts).
  it('Karutan 66: no table card on top of the insect\'s own (GMKarutan1.cpp:68-82)', () => {
    expect(lightEmittersFor(ENUM_WORLD.WD_80KARUTAN1, 66)).toBeUndefined();
  });
});

// BITMAP_FLARE is Flare.jpg, a warm star (ZzzOpenData.cpp:5309): the tint is the original's, not a warm stand-in.
describe('the map flares the original draws as BITMAP_FLARE', () => {
  // `CreateSprite(BITMAP_FLARE, Position, 3.0f, Light, pObject, (WorldTime / 10.0f))` on bone 4, 201 up.
  it('Aida 75: white, 3 across, on bone 4, turning a tenth of a degree a millisecond (GMAida.cpp:304-311)', () => {
    expect(cardsOf(ENUM_WORLD.WD_33AIDA, 75)).toEqual([
      {
        offset: [0, -1, 201],
        bone: true,
        sprite: { scale: 3, color: [1, 1, 1], texture: 'flare', unscaled: true, spin: 0.1 },
      },
    ]);
  });

  // `p[2] += 350 + aaa`, `aaa` riding Time_Effect 0 to 20 and back over 41 frames at 25 a second; the second
  // card turns by the shared `Ro`, a degree a frame.
  it('Crywolf 41: two white, 1.3, bobbing 350-370 up, the second turning (GMCrywolf1st.cpp:395-416)', () => {
    const card = { scale: 1.3, color: [1, 1, 1], texture: 'flare', unscaled: true, bob: { height: 20, period: 1640 } };
    expect(cardsOf(ENUM_WORLD.WD_34CRYWOLF_1ST, 41)).toEqual([
      { offset: [0, 0, 350], sprite: card },
      { offset: [0, 0, 350], sprite: { ...card, spin: 0.025 } },
    ]);
  });

  // `for (i = 1; i <= 3; ++i)` a card on bone i: the top head 304 up, the two arms 264 up and 56 out.
  it('Loren Market 30: grey, breathing like its fLumi, one on each of its three heads (GMUnitedMarketPlace.cpp:248-263)', () => {
    const sprite = { scale: 1.5, color: [0.5, 0.5, 0.5], pulse: { speed: 0.002, amount: 0.2, base: 0.6 }, texture: 'flare' };
    const heads = [[0, 0, 304], [0, 57, 264], [0, -56, 264]];
    expect(cardsOf(ENUM_WORLD.WD_79UNITEDMARKETPLACE, 30)).toEqual(heads.map(offset => ({ offset, bone: true, sprite })));
  });

  // `TransformPosition(BoneTransform[2], ...)`: the lantern's bone 2, 16 up, swaying 5 across in x.
  it('Loren Market 35: grey, breathing like its fLumi, on bone 2 (GMUnitedMarketPlace.cpp:264-275)', () => {
    const flare = flareOf(ENUM_WORLD.WD_79UNITEDMARKETPLACE, 35);
    expect([flare?.offset, flare?.bone]).toEqual([[-2, -24, 16], true]);
    expect(flare?.sprite).toEqual({
      scale: 1.5,
      color: [0.7, 0.7, 0.7],
      pulse: { speed: 0.039, amount: 0.2, base: 0.6 },
      texture: 'flare',
    });
  });
});
