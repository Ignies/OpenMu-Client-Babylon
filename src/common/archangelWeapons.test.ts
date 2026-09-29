import { describe, expect, it } from 'vitest';
import { itemNameColor } from './itemTooltip';
import { DROP_TIER_COLOURS, dropTier } from './dropTier';

const DIVINE: [group: number, num: number][] = [
  [0, 19], // sword
  [2, 13], // scepter
  [4, 18], // crossbow
  [5, 10], // staff
  [5, 36], // stick
];

describe('the Divine weapons of the Archangel', () => {
  it('are named in purple, whatever their level or options', () => {
    for (const [group, num] of DIVINE) {
      expect(itemNameColor({ group, num })).toBe('purple');
      expect(itemNameColor({ group, num, lvl: 11, optionLevel: 2 })).toBe('purple');
    }
  });

  it('are named in purple on the ground', () => {
    for (const [group, num] of DIVINE) {
      const tier = dropTier({ item: { group, num } } as Parameters<typeof dropTier>[0]);
      expect(tier).toBe('archangel');
      expect(DROP_TIER_COLOURS[tier]).toBe('#ff1aff');
    }
  });

  it('leave the other weapons alone', () => {
    expect(itemNameColor({ group: 5, num: 0 })).toBe('white');
    expect(dropTier({ item: { group: 5, num: 0 } } as Parameters<typeof dropTier>[0])).toBe('normal');
  });
});
