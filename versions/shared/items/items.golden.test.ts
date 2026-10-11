import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { items } from './all';

/**
 * The item files are the old items.json split one per item. This hash is that table's, in (group, index)
 * order, so any change to an item's data shows here: update it on purpose, in the same commit.
 */
const ITEMS_HASH = '7ebde64356bcff5714debe9c0842cebae3887db8f6f96232577806a0b03b158b';

describe('item files', () => {
  it('hold every item, unchanged', () => {
    const list = items.all();
    expect(list).toHaveLength(705);
    expect(createHash('sha256').update(JSON.stringify(list)).digest('hex')).toBe(ITEMS_HASH);
  });

  it('draw each seed sphere with its level\'s model (MODEL_SEED_SPHERE_FIRE_1 + level * 6 + element, ZzzOpenData.cpp:871-875)', () => {
    for (let index = 100; index <= 129; index++) {
      expect(items.get(12, index)?.szModelName).toBe(`s30_sphere0${Math.floor((index - 100) / 6) + 1}.glb`);
    }
  });

  it('look items up by group and index', () => {
    expect(items.get(0, 0)?.ItemName).toBe('Kris');
    expect(items.get(99, 0)).toBeNull();
  });
});
