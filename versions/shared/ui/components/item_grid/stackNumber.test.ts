import { describe, expect, it } from 'vitest';
import { stackNumberAt } from './stackNumber';

// RenderNumberOfItem: RenderNumber(x + width - 6, y + 1, count) (NewUIInventoryCtrl.cpp:1531-1583).
describe('stackNumberAt', () => {
  it("centres the count 6 px in from the item's right edge, 1 px down", () => {
    expect(stackNumberAt({ group: 14, num: 3, durability: 7 }, 20)).toEqual({ value: 7, x: 14, y: 1 });
    expect(stackNumberAt({ group: 12, num: 31, lvl: 2 }, 40)).toEqual({ value: 30, x: 34, y: 1 });
  });

  it('draws nothing for a single piece or an item that does not stack', () => {
    expect(stackNumberAt({ group: 14, num: 3, durability: 1 }, 20)).toBeNull();
    expect(stackNumberAt({ group: 0, num: 0, durability: 30 }, 20)).toBeNull();
  });
});
