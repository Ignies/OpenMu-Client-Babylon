import { describe, expect, it } from 'vitest';
import { InventoryConstants } from './inventoryConstants';
import { findFreeSlot } from './inventoryFit';

const first = InventoryConstants.LastEquippableItemSlotIndex + 1;
const columns = InventoryConstants.RowSize;
const rows = InventoryConstants.InventoryRows;

describe('findFreeSlot', () => {
  it('takes the top-left square of an empty grid', () => {
    expect(findFreeSlot([], rows, 1, 1)).toBe(first);
  });

  it('scans row-major and anchors at the top-left of the first hole', () => {
    // A full first row plus a 2x2 at the start of the second: a 1x1 lands
    // right of the 2x2, a 3x3 fits beside it too, and a 7-wide item has to
    // drop below it, to the first row with seven free squares.
    const occupied = [
      { slot: first, width: columns, height: 1 },
      { slot: first + columns, width: 2, height: 2 },
    ];
    expect(findFreeSlot(occupied, rows, 1, 1)).toBe(first + columns + 2);
    expect(findFreeSlot(occupied, rows, 3, 3)).toBe(first + columns + 2);
    expect(findFreeSlot(occupied, rows, 7, 1)).toBe(first + columns * 3);
  });

  it('fits Wings of Angel beside a column of jewels', () => {
    const jewels = Array.from({ length: rows }, (_, row) => ({
      slot: first + row * columns,
      width: 1,
      height: 1,
    }));
    expect(findFreeSlot(jewels, rows, 5, 3)).toBe(first + 1);
  });

  it('answers -1 when nothing fits', () => {
    expect(findFreeSlot([{ slot: first, width: columns, height: rows }], rows, 1, 1)).toBe(-1);
    expect(findFreeSlot([], rows, columns + 1, 1)).toBe(-1);
  });

  it('clips a footprint at the right edge instead of wrapping it', () => {
    // A 2-wide item on the last column must not mark the next row's first
    // square, which is where a 1x1 then belongs.
    const occupied = [
      { slot: first, width: columns - 1, height: 1 },
      { slot: first + columns - 1, width: 2, height: 1 },
    ];
    expect(findFreeSlot(occupied, rows, 1, 1)).toBe(first + columns);
  });

  it('ignores equipment, extension rows and the store', () => {
    const occupied = [
      { slot: InventoryConstants.ArmorSlot, width: 2, height: 3 },
      { slot: InventoryConstants.FirstExtensionItemSlotIndex, width: 1, height: 1 },
      { slot: InventoryConstants.FirstStoreItemSlotIndex, width: 1, height: 1 },
    ];
    expect(findFreeSlot(occupied, rows, 1, 1)).toBe(first);
  });

  it('honours the row count it is given', () => {
    const full = [{ slot: first, width: columns, height: rows }];
    expect(findFreeSlot(full, rows + InventoryConstants.RowsOfOneExtension, 1, 1)).toBe(
      first + rows * columns
    );
  });
});
