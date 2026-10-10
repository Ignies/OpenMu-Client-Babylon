import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { items } from './all';

/**
 * The item files are the old items.json split one per item. This hash is that table's, in (group, index)
 * order, so any change to an item's data shows here: update it on purpose, in the same commit.
 */
const ITEMS_HASH = '5810c13c67bb66f5514a59e42ed13d7c898f5ea32bb8259ce56521eda80cd61b';

describe('item files', () => {
  it('hold every item, unchanged', () => {
    const list = items.all();
    expect(list).toHaveLength(690);
    expect(createHash('sha256').update(JSON.stringify(list)).digest('hex')).toBe(ITEMS_HASH);
  });

  it('look items up by group and index', () => {
    expect(items.get(0, 0)?.ItemName).toBe('Kris');
    expect(items.get(99, 0)).toBeNull();
  });
});
