import { describe, expect, it } from 'vitest';
import { isRepairBanned, itemValue, repairCost } from './itemValue';

const at = (group: number, num: number, durability?: number) => ({ group, num, durability });

// IsRepairBan (ZzzInventory.cpp:7485-7552): what no smith touches. Every wing, the Summoner's included,
// is repaired; the orbs and the Jewel of Chaos (12/7-19), arrows, pets and the event helpers are not.
describe('IsRepairBan', () => {
  it('repairs every wing and the rings, pendants and capes', () => {
    for (const [group, num] of [[12, 41], [12, 42], [12, 0], [12, 49], [13, 30], [13, 8], [13, 24], [13, 28]]) {
      expect(isRepairBanned(at(group, num)), `${group}/${num}`).toBe(false);
    }
  });

  it('bans the orbs and chaos, arrows, the old pets and helpers, the Fenrir parts and the event rings', () => {
    for (const [group, num] of [[12, 7], [12, 15], [12, 19], [4, 15], [13, 0], [13, 3], [13, 4], [13, 10], [13, 20], [13, 37], [13, 39], [13, 64], [13, 76], [13, 85], [14, 13]]) {
      expect(isRepairBanned(at(group, num)), `${group}/${num}`).toBe(true);
    }
  });
});

// CalcRepairCost over ItemValue(ip, 2) (ZzzInventory.cpp:1162-1210).
describe('the repair price', () => {
  it('is asked for a worn Wings of Despair', () => {
    expect(repairCost(at(12, 42, 100), false)).toBeGreaterThan(0);
  });
});

// ItemValue's goldType 1 takes the repair share off everything but its own exceptions (ZzzInfomation.cpp:2114-2190).
describe('the selling price of a worn item', () => {
  it('drops for the Summoner wings and the rings as for any other', () => {
    expect(itemValue(at(12, 42, 50), 1)).toBeLessThan(itemValue(at(12, 42, 200), 1));
    expect(itemValue(at(13, 8, 10), 1)).toBeLessThan(itemValue(at(13, 8, 50), 1));
  });

  it('keeps the price of the Fenrir parts and the Wizard\'s Ring', () => {
    expect(itemValue(at(13, 20, 1), 1)).toBe(itemValue(at(13, 20, 255), 1));
  });
});
