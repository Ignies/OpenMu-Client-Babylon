import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '../../ecs/world';
import { items } from '@versions/shared/items/all';
import { isTwoHanded } from './weaponClass';

const item = (group: number, num: number) => ({ group, num, lvl: 0 }) as Item;

// `ItemAttribute[Type].TwoHand` picks the stance (ZzzCharacter.cpp:357-392) and the bag pose (ZzzInventory.cpp:7808).
describe('two-handedness', () => {
  it('is the item table\'s own flag, not its width', () => {
    // The wide staffs are two-handed, Legendary Staff and the narrow ones after it one-handed.
    expect(isTwoHanded(item(5, 4))).toBe(true); // Gorgon Staff
    expect(isTwoHanded(item(5, 5))).toBe(false); // Legendary Staff
    expect(isTwoHanded(item(5, 6))).toBe(false); // Staff of Resurrection
    expect(isTwoHanded(item(0, 15))).toBe(true); // Giant Sword
    expect(isTwoHanded(item(0, 13))).toBe(false); // Double Blade
    expect(isTwoHanded(item(4, 0))).toBe(true); // Short Bow
    expect(isTwoHanded(item(4, 15))).toBe(false); // Arrows
  });
});

const ITEM_BMD = 'Data/Local/Eng/item_eng.bmd';

describe.skipIf(!existsSync(ITEM_BMD))('the TwoHand column', () => {
  // `ITEM_ATTRIBUTE_FILE_LEGACY` (ItemStructs.h): 84-byte records through the Bux key, `Name[30]` then `TwoHand`.
  const bytes = new Uint8Array(readFileSync(ITEM_BMD));
  const at = (group: number, index: number, offset: number) =>
    bytes[(group * 512 + index) * 84 + offset] ^ [0xfc, 0xcf, 0xab][offset % 3];

  it('matches Item.bmd on every weapon row it has', () => {
    const rows = items.all().filter(row => row.Group <= 6 && at(row.Group, row.Index, 0) !== 0);
    expect(rows.length).toBeGreaterThan(100);
    const wrong = rows.filter(row => isTwoHanded(item(row.Group, row.Index)) !== (at(row.Group, row.Index, 30) === 1));
    expect(wrong.map(row => `${row.Group}/${row.Index}`)).toEqual([]);
  });
});
