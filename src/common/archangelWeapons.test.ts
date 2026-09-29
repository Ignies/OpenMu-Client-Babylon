import { describe, expect, it } from 'vitest';
import { buildItemTooltip, itemDisplayName, itemNameColor } from './itemTooltip';
import { DROP_TIER_COLOURS, dropTier } from './dropTier';
import { itemIconPackChain } from './itemIconPack';
import type { HeroStats } from './itemStats';

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

const HERO: HeroStats = {
  level: 100, str: 30, agi: 30, vit: 30, ene: 30, cmd: 0, baseClass: 1, stepClass: 1,
};

describe('the Weapon of Archangel', () => {
  const weapon = (lvl: number) => ({ group: 13, num: 19, lvl });

  it('is named for the weapon it is, in yellow', () => {
    expect(itemDisplayName(weapon(0))).toBe('Absolute Staff of Archangel');
    expect(itemDisplayName(weapon(1))).toBe('Absolute Sword of Archangel');
    expect(itemDisplayName(weapon(2))).toBe('Absolute Crossbow of Archangel');
    expect(itemNameColor(weapon(1))).toBe('yellow');
  });

  it('shows the quest item block and no durability', () => {
    const lines = buildItemTooltip({ ...weapon(1), durability: 1 }, HERO)?.lines ?? [];
    const text = lines.map(l => l.text);
    expect(text).toContain('Quest Item');
    expect(lines.find(l => l.text.startsWith('Reward'))?.color).toBe('darkRed');
    expect(text).toContain('One-handed Attack Power: 110 ~ 120');
    expect(text.some(l => l.startsWith('Durability'))).toBe(false);
  });

  it('is drawn in the bag as its Divine weapon', () => {
    expect(itemIconPackChain(weapon(0))[0]).toBe('/items/item_13_19_0.png');
    expect(itemIconPackChain(weapon(1))[0]).toBe('/items/item_0_19_0.png');
    expect(itemIconPackChain(weapon(2))[0]).toBe('/items/item_4_18_0.png');
  });

  it('lies on the ground in the Divine weapons\' purple', () => {
    const tier = dropTier({ item: weapon(2) } as Parameters<typeof dropTier>[0]);
    expect(DROP_TIER_COLOURS[tier]).toBe('#ff1aff');
  });
});
