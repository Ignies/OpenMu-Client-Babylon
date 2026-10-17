import { describe, expect, it } from 'vitest';
import { isPackedJewel, stackCount } from './packedJewels';

describe('stackCount (RenderNumberOfItem, NewUIInventoryCtrl.cpp:1531-1583)', () => {
  it("counts a packed jewel's loose jewels by its level", () => {
    expect([0, 1, 2].map(lvl => stackCount({ group: 12, num: 31, lvl }))).toEqual([10, 20, 30]);
    expect(stackCount({ group: 12, num: 141 })).toBe(10);
  });

  it("counts the pieces of the original's stacking potions only", () => {
    for (const num of [0, 8, 35, 40, 46, 50, 70, 71, 78, 82, 85, 90, 94, 133]) {
      expect(stackCount({ group: 14, num, durability: 7 }), `14/${num}`).toBe(7);
    }
    for (const num of [9, 13, 16, 34, 41, 51, 72, 83, 91, 95]) {
      expect(stackCount({ group: 14, num, durability: 7 }), `14/${num}`).toBe(0);
    }
    expect(stackCount({ group: 12, num: 15, durability: 3 })).toBe(0);
  });

  it('knows the ten packs (_enum.h:2635-2636, :2697-2704)', () => {
    expect([30, 31, 136, 137, 138, 139, 140, 141, 142, 143].every(n => isPackedJewel(12, n))).toBe(true);
    expect(isPackedJewel(12, 32) || isPackedJewel(12, 135) || isPackedJewel(14, 31)).toBe(false);
  });
});
