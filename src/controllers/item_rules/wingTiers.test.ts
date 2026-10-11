import { describe, expect, it } from 'vitest';
import { buildItemTooltip } from '../interface/itemTooltip';
import { itemStats, type HeroStats } from './itemStats';
import { itemValue } from './itemValue';

const HERO: HeroStats = { level: 400, str: 999, agi: 999, vit: 999, ene: 999, cmd: 999, baseClass: 5, stepClass: 3 };
const text = (num: number) => (buildItemTooltip({ group: 12, num, durability: 200 }, HERO)?.lines ?? []).map(l => l.text);

// ITEM_WING_OF_CURSE (12/41) is a first wing, ITEM_WINGS_OF_DESPAIR (12/42) a second one.
describe('the Summoner wings', () => {
  it('take their tier in the tooltip (ZzzInventory.cpp:4208, :4255)', () => {
    expect(text(41)).toEqual(expect.arrayContaining(['Increase Damage +12%', 'Absorb Damage +12%']));
    expect(text(42)).toEqual(expect.arrayContaining(['Increase Damage +32%', 'Absorb Damage +25%']));
  });

  it('take their tier in the defense per level (ZzzInfomation.cpp:683-686)', () => {
    const gain = (num: number) => (itemStats({ group: 12, num, lvl: 3 })?.defense ?? 0) - (itemStats({ group: 12, num })?.defense ?? 0);
    expect(gain(42)).toBe(6);
    expect(gain(41)).toBe(9);
  });

  // ItemValue (ZzzInfomation.cpp:1867-1907): every wing up to 12/6 and 12/36-43, 12/50 on the 40,000,000 scale.
  it('are priced on the wings scale', () => {
    for (const num of [0, 3, 41, 42, 43]) expect(itemValue({ group: 12, num }, 0), String(num)).toBeGreaterThan(40_000_000);
    expect(itemValue({ group: 12, num: 49 }, 0)).toBeLessThan(40_000_000);
  });
});
