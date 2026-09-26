import { describe, expect, it } from 'vitest';
import type { Item } from '../ecs/world';
import { ammoReload } from './weaponRange';

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
