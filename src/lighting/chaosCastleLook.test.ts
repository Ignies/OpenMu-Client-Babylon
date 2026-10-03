import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '../common/types';
import { profileFor } from './profiles';

const CASTLES = [
  ENUM_WORLD.WD_18CHAOS_CASTLE,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 1,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 2,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 3,
  ENUM_WORLD.WD_18CHAOS_CASTLE + 4,
  ENUM_WORLD.WD_18CHAOS_CASTLE_END,
  ENUM_WORLD.WD_53CAOSCASTLE_MASTER_LEVEL,
] as ENUM_WORLD[];

describe('the Chaos Castle look', () => {
  it('has no sky and fades into black, in every castle', () => {
    for (const world of CASTLES) {
      const look = profileFor(world);
      expect(look.sky).toBeNull();
      expect(look.fog.density).toBeGreaterThan(0);
      expect(look.fog.color).toEqual([0, 0, 0]);
    }
  });

  it('keeps the haze off the hero at every zoom', () => {
    const fog = profileFor(ENUM_WORLD.WD_18CHAOS_CASTLE).fog;
    expect(fog.fromTarget).toBe(true);
    expect(fog.start).toBeGreaterThan(0);
  });

  it('has no fog under the floor to go black at a low camera', () => {
    expect(profileFor(ENUM_WORLD.WD_18CHAOS_CASTLE).underworld).toBeUndefined();
  });

  it('leaves the open maps their sky', () => {
    expect(profileFor(ENUM_WORLD.WD_0LORENCIA).sky).not.toBeNull();
    expect(profileFor(ENUM_WORLD.WD_9DEVILSQUARE).sky).not.toBeNull();
  });
});
