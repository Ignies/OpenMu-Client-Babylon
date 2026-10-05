import { afterEach, describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';

/** The table flares the original never draws: each object lights the ground and nothing more. */
const OURS: readonly [ENUM_WORLD, number, string][] = [
  [ENUM_WORLD.WD_0LORENCIA, 90, 'the street lamp (ZzzObject.cpp:3781-3785, :4583-4586)'],
  [ENUM_WORLD.WD_0LORENCIA, 150, 'the table candle (ZzzObject.cpp:3810-3814, :4587-4590)'],
  [ENUM_WORLD.WD_2DEVIAS, 66, 'the hearth, a CreateFire alone (ZzzObject.cpp:3874-3876)'],
  [ENUM_WORLD.WD_51ELBELAND, 61, 'the blue fire bowl (GMNewTown.cpp:135-140, :282-288)'],
  [ENUM_WORLD.WD_4LOSTTOWER, 23, 'the brazier, its sprite commented out (ZzzObject.cpp:3971-3975)'],
];

const cards = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.filter(e => e.sprite).length;

describe('the flares the original never draws (lampFlares)', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('glow on Enhanced', () => {
    for (const [world, type, what] of OURS) expect(cards(world, type), what).toBe(1);
  });

  it('are gone on Classic, the rest of the row stays', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    for (const [world, type, what] of OURS) {
      expect(cards(world, type), what).toBe(0);
      expect(lightEmittersFor(world, type)?.[0].terrain, what).toBeDefined();
    }
  });
});
