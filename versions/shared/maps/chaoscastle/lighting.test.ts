import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { profileFor } from '@/controllers/lighting/profiles';
import { chaoscastleLayer } from './index';

describe("Chaos Castle's look", () => {
  // `InChaosCastle()` takes 18-23 and 53 alike and `LoadWorld` draws them all from World19
  // (MapManager.cpp:1217, 1575): one map, one look row.
  it('is the same row on every arena', () => {
    const [first, ...rest] = chaoscastleLayer.worlds;
    for (const world of rest) expect(profileFor(world)).toBe(profileFor(first));
  });

  // No sky; the frame clears to black, fog included (SceneManager.cpp:572).
  it('has no sky and fades into black, in every castle', () => {
    for (const world of chaoscastleLayer.worlds) {
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
