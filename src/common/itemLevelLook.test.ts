import { describe, expect, it } from 'vitest';
import { itemLevelName } from './itemLevelLook';
import { itemIconUrl } from './itemIconPack';

const POTION = 14;
const BOX_OF_LUCK = 11;

const name = (lvl: number) => itemLevelName(POTION, BOX_OF_LUCK, lvl, 'Box of Luck');
const icon = (lvl: number) => itemIconUrl({ group: POTION, num: BOX_OF_LUCK, lvl });

describe('Box of Luck by level', () => {
  it('names each level as the item it is', () => {
    expect(name(0)).toBe('Box of Luck');
    expect(name(1)).toBe('Star of Sacred Birth');
    expect(name(6)).toBe('Gold Medal');
    expect(name(13)).toBe('Heart of Dark Lord');
    expect(name(15)).toBe('Red Lucky Pouch');
  });

  it('counts the Box of Kundun from +1 at level 8', () => {
    expect(name(8)).toBe('Box of Kundun +1');
    expect(name(12)).toBe('Box of Kundun +5');
  });

  it('keeps the box and its level where the original has no other name', () => {
    expect(name(4)).toBe('Box of Luck +4');
  });

  it('draws each level with its own icon, not the pack tint', () => {
    expect(icon(0)).toBe('/items/item_14_11_0.png');
    for (const lvl of [1, 2, 4, 8, 10, 12, 14]) {
      expect(icon(lvl)).toBe(`/items/item_14_11_${lvl}.png`);
    }
  });
});
