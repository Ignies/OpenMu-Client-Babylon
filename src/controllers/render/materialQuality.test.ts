import { describe, expect, it, vi } from 'vitest';

const options = vi.hoisted(() => ({ materialQuality: 0 }));

vi.mock('@/controllers/settings', () => ({ GameOptions: options }));
vi.mock('../lighting/lightingQuality', () => ({ lightingTier: () => null }));

import { pbrCovers } from './materialQuality';

describe('pbrCovers', () => {
  it.each([
    [0, false, false],
    [0, true, false],
    [1, false, false],
    [1, true, true],
    [2, false, true],
    [2, true, true],
  ])('tier %i, character %s -> %s', (tier, character, expected) => {
    options.materialQuality = tier;

    expect(pbrCovers(character)).toBe(expected);
  });
});
