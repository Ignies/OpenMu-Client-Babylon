import { describe, expect, it } from 'vitest';
import { profileFor } from '@/controllers/lighting/profiles';
import { chaoscastleLayer } from './index';

describe("Chaos Castle's look", () => {
  // `InChaosCastle()` takes 18-23 and 53 alike and `LoadWorld` draws them all from World19
  // (MapManager.cpp:1217, 1575): one map, one look row.
  it('is the same row on every arena', () => {
    const [first, ...rest] = chaoscastleLayer.worlds;
    for (const world of rest) expect(profileFor(world)).toBe(profileFor(first));
  });
});
