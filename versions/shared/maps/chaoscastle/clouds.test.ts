import { describe, expect, it } from 'vitest';
import {
  CHAOS_CASTLE_CLOUD_BANKS,
  CHAOS_CASTLE_EFFECT_ONLY_TYPES,
} from './spec';

describe('the Chaos Castle fog', () => {
  it('stands the original bank on each marker type', () => {
    // RenderChaosCastleVisual: 10 clouds on 6-8, 5 on 9-11, SubType = type - 6.
    expect(
      Object.entries(CHAOS_CASTLE_CLOUD_BANKS).map(([type, bank]) => [
        +type,
        bank.count,
        bank.subType,
      ])
    ).toEqual([
      [6, 10, 0],
      [7, 10, 1],
      [8, 10, 2],
      [9, 5, 3],
      [10, 5, 4],
      [11, 5, 5],
    ]);
  });

  it('is dim blue', () => {
    for (const bank of Object.values(CHAOS_CASTLE_CLOUD_BANKS)) {
      expect(bank.light).toEqual([0.05, 0.05, 0.1]);
    }
  });

  it('leaves only the darkening under the castle as a marker', () => {
    expect(CHAOS_CASTLE_EFFECT_ONLY_TYPES).toEqual([12]);
  });
});
