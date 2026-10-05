import { afterEach, describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';
import { DEVIAS_CANDELABRA } from './devias/spec';

/** The table flares the original never draws: each object lights the ground and nothing more. */
const OURS: readonly [ENUM_WORLD, number, string][] = [
  [ENUM_WORLD.WD_0LORENCIA, 90, 'the street lamp (ZzzObject.cpp:3781-3785, :4583-4586)'],
  [ENUM_WORLD.WD_0LORENCIA, 150, 'the table candle (ZzzObject.cpp:3810-3814, :4587-4590)'],
  [ENUM_WORLD.WD_2DEVIAS, 66, 'the hearth, a CreateFire alone (ZzzObject.cpp:3874-3876)'],
  [ENUM_WORLD.WD_51ELBELAND, 61, 'the blue fire bowl (GMNewTown.cpp:135-140, :282-288)'],
];

/** The Lost Tower rows: its map code lights no ground (ZzzObject.cpp:2887-2912, :3952-3985). */
const LOST_TOWER: readonly [number, string][] = [
  [18, 'the wall lamp, a BlendMesh alone'],
  [19, 'the red machine, its sprites alone'],
  [20, 'the blue machine, its sprites alone'],
  [23, 'the brazier, its sprite commented out (ZzzObject.cpp:3971-3975)'],
];

const cards = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.filter(e => e.sprite).length;

const lostTower = (type: number) => lightEmittersFor(ENUM_WORLD.WD_4LOSTTOWER, type) ?? [];

describe('the lamp lights and flares the original never draws (lampFlares)', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('glow and light the ground on Enhanced', () => {
    for (const [world, type, what] of OURS) expect(cards(world, type), what).toBe(1);
    expect(cards(ENUM_WORLD.WD_4LOSTTOWER, 23)).toBe(1);
    for (const [type, what] of LOST_TOWER) expect(lostTower(type)[0]?.terrain, what).toBeDefined();
    expect(DEVIAS_CANDELABRA.terrain).toBeDefined();
  });

  it('draw no flare on Classic, the light the original throws under them stays', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    for (const [world, type, what] of OURS) {
      expect(cards(world, type), what).toBe(0);
      expect(lightEmittersFor(world, type)?.[0].terrain, what).toBeDefined();
    }
  });

  // The candelabra (54, 56) have a BlendMesh alone (ZzzObject.cpp:4658-4660).
  it('light no ground on Classic where the original lights none: Lost Tower, the Devias candelabra', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    for (const [type, what] of LOST_TOWER) expect(lostTower(type).some(e => e.terrain || e.sprite), what).toBe(false);
    expect(DEVIAS_CANDELABRA.terrain).toBeUndefined();
  });
});
