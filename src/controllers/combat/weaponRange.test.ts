import { describe, expect, it } from 'vitest';
import type { Item } from '../../ecs/world';
import { ammoReload, hasAmmo } from './weaponRange';

const item = (num: number) => ({ group: 4, num }) as Item;
const BOW = item(3);
const CROSSBOW = item(10);
const ARROWS = item(15);
const BOLTS = item(7);

function bag(entries: Record<number, Item>): (Item | null)[] {
  const items: (Item | null)[] = new Array(76).fill(null);
  for (const [slot, it] of Object.entries(entries)) items[Number(slot)] = it;
  return items;
}

describe('ammoReload', () => {
  it('puts the last arrows of the bag in the empty right hand of a bow', () => {
    const hands = { leftHand: BOW, rightHand: null };
    expect(ammoReload(hands, bag({ 20: ARROWS, 40: ARROWS, 50: BOLTS }), 12, 0, 1)).toEqual({
      from: 40,
      to: 1,
    });
  });

  it('puts bolts in the empty left hand of a crossbow', () => {
    const hands = { leftHand: null, rightHand: CROSSBOW };
    expect(ammoReload(hands, bag({ 30: ARROWS, 31: BOLTS }), 12, 0, 1)).toEqual({ from: 31, to: 0 });
  });

  it('reports an empty bag', () => {
    const hands = { leftHand: BOW, rightHand: null };
    expect(ammoReload(hands, bag({ 30: BOLTS }), 12, 0, 1)).toEqual({ from: -1, to: 1 });
  });

  it('leaves an occupied hand and a launcher-less hero alone', () => {
    expect(ammoReload({ leftHand: BOW, rightHand: BOLTS }, bag({ 30: ARROWS }), 12, 0, 1)).toBeNull();
    expect(ammoReload({ leftHand: null, rightHand: null }, bag({ 30: ARROWS }), 12, 0, 1)).toBeNull();
  });
});

// IsBowModel / IsCrossbowModel (CharacterManager.cpp:68-80): 17 and 20-24 are bows, so they shoot arrows.
describe('hasAmmo', () => {
  it('takes arrows for every bow, bolts for every crossbow', () => {
    for (const n of [0, 3, 6, 17, 20, 21, 22, 23, 24]) {
      expect(hasAmmo({ leftHand: item(n), rightHand: ARROWS })).toBe(true);
      expect(hasAmmo({ leftHand: item(n), rightHand: BOLTS })).toBe(false);
    }
    for (const n of [8, 10, 14, 16, 18, 19]) {
      expect(hasAmmo({ leftHand: BOLTS, rightHand: item(n) })).toBe(true);
      expect(hasAmmo({ leftHand: ARROWS, rightHand: item(n) })).toBe(false);
    }
  });
});
