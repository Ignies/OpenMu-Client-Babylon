import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { items } from './all';

/**
 * The item files are the old items.json split one per item. This hash is that table's, in (group, index)
 * order, so any change to an item's data shows here: update it on purpose, in the same commit.
 */
const ITEMS_HASH = '3fead1832bf8437df8dbd5a9ed4c3ce3369bb5a608ba3d4ae7d1bee8b210d19d';

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

  // AccessModel: MODEL_FIRECRACKER is GM01, the compressed Bless and Soul Jewel01 / Jewel02 (ZzzOpenData.cpp:957-958, :984).
  it('draw the fireworks and the compressed jewels with the models the original loads', () => {
    expect(items.get(14, 63)?.szModelName).toBe('GM01.glb');
    expect(items.get(12, 30)?.szModelName).toBe('Jewel01.glb');
    expect(items.get(12, 31)?.szModelName).toBe('Jewel02.glb');
  });

  it('look items up by group and index', () => {
    expect(items.get(0, 0)?.ItemName).toBe('Kris');
    expect(items.get(99, 0)).toBeNull();
  });
});
