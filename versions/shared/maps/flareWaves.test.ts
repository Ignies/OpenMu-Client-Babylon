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

  // `switch (rand() % 3)`: one FIRE_HIK1, FIRE_CURSEDLICH or FIRE_HIK3 particle a tick (`CreateParticleFpsChecked`).
  it('fire vents burn the original\'s three fire sheets every tick (GMKarutan1.cpp:107-120, GMUnitedMarketPlace.cpp:303-316)', () => {
    const vents: [ENUM_WORLD, number][] = [
      [ENUM_WORLD.WD_80KARUTAN1, 113],
      [ENUM_WORLD.WD_81KARUTAN2, 113],
      [ENUM_WORLD.WD_79UNITEDMARKETPLACE, 57],
      [ENUM_WORLD.WD_63PK_FIELD, 6],
    ];
    for (const [world, type] of vents) {
      const fires = lightEmittersFor(world, type)?.flatMap(e => (Array.isArray(e.emissions) ? e.emissions : []));
      expect(fires?.map(f => [f.kinds, f.every]), `world ${world} type ${type}`).toEqual([[['fire1', 'fire2', 'fire3'], 1]]);
    }
  });

  // `CreateParticle` copies `o->Position` (ZzzEffectParticle.cpp:75) and FIRE_HIK1 0, FIRE_CURSEDLICH 4 and FIRE_HIK3 0
  // add no offset (:1847-1856, :321-330, :1924-1933): every preset, a correction.
  it('fire vents spawn their fire at the vent, no spread (ZzzEffectParticle.cpp:321-330, :1847-1856, :1924-1933)', () => {
    const vents: [ENUM_WORLD, number][] = [
      [ENUM_WORLD.WD_80KARUTAN1, 113],
      [ENUM_WORLD.WD_81KARUTAN2, 113],
      [ENUM_WORLD.WD_79UNITEDMARKETPLACE, 57],
      [ENUM_WORLD.WD_63PK_FIELD, 6],
      [ENUM_WORLD.WD_66DOPPLEGANGER2, 6],
    ];
    for (const [world, type] of vents) {
      const fires = lightEmittersFor(world, type)?.flatMap(e => (Array.isArray(e.emissions) ? e.emissions : []));
      expect(fires?.map(f => f.jitter), `world ${world} type ${type}`).toEqual([undefined]);
    }
  });

  // `if (rand_fps_check(3)) CreateParticle(BITMAP_TRUE_FIRE, ...)`: one tick in three; the Swamp's smoke on the same roll.
  it('the BITMAP_TRUE_FIRE braziers burn one tick in three (GMNewTown.cpp:249-254, GM_Kanturu_1st.cpp:158-164, GM3rdChangeUp.cpp:126-132, GMSwampOfQuiet.cpp:139-148)', () => {
    const braziers: [ENUM_WORLD, number][] = [
      [ENUM_WORLD.WD_51ELBELAND, 0],
      [ENUM_WORLD.WD_37KANTURU_1ST, 61],
      [ENUM_WORLD.WD_40AREA_FOR_GM, 61],
      [ENUM_WORLD.WD_68DOPPLEGANGER4, 61],
      [ENUM_WORLD.WD_41CHANGEUP3RD_1ST, 3],
      [ENUM_WORLD.WD_42CHANGEUP3RD_2ND, 3],
      [ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET, 57],
    ];
    for (const [world, type] of braziers) {
      const emissions = lightEmittersFor(world, type)?.flatMap(e => (Array.isArray(e.emissions) ? e.emissions : []));
      expect(emissions?.length, `world ${world} type ${type}`).toBeGreaterThan(0);
      expect(emissions?.map(f => f.every), `world ${world} type ${type}`).toEqual(emissions?.map(() => 3));
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

  // `fLumi = (sinf(WorldTime * 0.002f) + 2.0f) * 0.5f` tints `(0.3, 0.5, 1)` and sizes the card, on bone 1 + (-1, 0, 0);
  // Kanturu 3's two BITMAP_SHINY + 1 turn `(int)(WorldTime / 2) % 360` and `/ 4` degrees.
  it('Kanturu 2 4 and Kanturu 3 5: the lamps breathe and grow with fLumi on bone 1, Kanturu 3\'s two Shiny02 cards turning (GM_Kanturu_2nd.cpp:335-346, GM_Kanturu_3rd.cpp:262-272)', () => {
    const fLumi = { speed: 0.002, amount: 0.5, base: 0.5 };
    const lamp = (scale: number, texture?: string, spin?: number) => ({
      offset: [0, 13, 244],
      bone: true,
      sprite: { scale, color: [0.3, 0.5, 1], pulse: fLumi, grow: fLumi, unscaled: true, texture, spin },
    });
    expect(cardsOf(ENUM_WORLD.WD_38KANTURU_2ND, 4).filter(e => !e.sprite?.texture)).toEqual([lamp(1 / 3.2)]);
    expect(cardsOf(ENUM_WORLD.WD_39KANTURU_3RD, 5)).toEqual([
      lamp(1 / 2.4),
      lamp(1 / 2.4, 'shiny1', 0.5),
      lamp(1 / 2.4, 'shiny1', 0.25),
    ]);
  });

  // Red: one card `Luminosity * 1.2f + 0.3f` across, `Luminosity = sinf(WorldTime * 0.002f) * 0.35f + 0.65f`, one 0.5;
  // then a grey BITMAP_SHINY + 1, 1.2, at `rand() % 360` degrees.
  it('Land of Trials 49: two red cards on bone 3, the first growing and shrinking, and a grey Shiny02 at a fresh angle (GMHuntingGround.cpp:143-156)', () => {
    const at = { offset: [-2, -82, 232], bone: true };
    expect(cardsOf(ENUM_WORLD.WD_31HUNTING_GROUND, 49)).toEqual([
      { ...at, sprite: { scale: 1, color: [1, 0, 0], grow: { speed: 0.002, amount: 0.42, base: 0.66 }, unscaled: true } },
      { ...at, sprite: { scale: 0.5, color: [1, 0, 0], unscaled: true } },
      { ...at, sprite: { scale: 1.2, color: [0.3, 0.3, 0.3], texture: 'shiny1', unscaled: true, randomAngle: true } },
    ]);
  });

  // `fLumi = (sinf(WorldTime * 0.001f) + 1.0f) * 0.3f + 0.4f` tints `(1, 1, 0.6)`; `Scale * 6` at bone 5 + (-40, -10, 0).
  it('Elbeland 63: the great lantern breathes on bone 5 (GMNewTown.cpp:289-300)', () => {
    expect(cardsOf(ENUM_WORLD.WD_51ELBELAND, 63)).toEqual([
      { offset: [10, -167, 415], bone: true, sprite: { scale: 6, color: [1, 1, 0.6], pulse: { speed: 0.001, amount: 0.3, base: 0.4 } } },
    ]);
  });

  // `fLumi = (sinf(WorldTime * 0.002f) + 1.0f) * 0.5f + 0.5f` tints `(1, 0.5, 0.3)` and sizes a card at each of bones 3-8 + (5, -4, -1).
  it('Elbeland 121: six cards on the totem that breathe and grow, unscaled (GMNewTown.cpp:312-327)', () => {
    const fLumi = { speed: 0.002, amount: 0.5, base: 0.5 };
    const bones = [[-12, 11, 348], [-12, -13, 348], [-17, 13, 232], [-20, 17, 105], [-20, -19, 105], [-17, -16, 232]];
    const sprite = { scale: 1, color: [1, 0.5, 0.3], pulse: fLumi, grow: fLumi, unscaled: true };
    expect(cardsOf(ENUM_WORLD.WD_51ELBELAND, 121)).toEqual(bones.map(offset => ({ offset, bone: true, sprite })));
  });

  it('turn at most 0.05 radians a millisecond on every map: a per-second speed strobes', () => {
    for (let world = 0; world < 90; world++) {
      for (let type = 0; type < 400; type++) {
        for (const { sprite, terrain } of lightEmittersFor(world as ENUM_WORLD, type) ?? []) {
          for (const wave of [sprite?.pulse, sprite?.grow, terrain?.pulse]) {
            if (wave) expect(wave.speed, `world ${world} type ${type}`).toBeLessThanOrEqual(0.05);
          }
        }
      }
    }
  });
});
