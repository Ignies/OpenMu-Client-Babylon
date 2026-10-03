import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { profileFor } from '@/controllers/lighting/profiles';

describe("Devil Square's look", () => {
  // `LoadWorld` folds map 32 into 9 (MapManager.cpp:1178): squares 5-7 are squares 1-4.
  it('is the same row on map 32 as on map 9', () => {
    expect(profileFor(ENUM_WORLD.WD_32DEVILSQUARE_5_7)).toBe(profileFor(ENUM_WORLD.WD_9DEVILSQUARE));
  });
});
