import { InventoryConstants } from './inventoryConstants';

/**
 * The free-rectangle search over an inventory grid, shared by the client
 * (`Store.buyOffline` in `src/store.ts`) and the cash shop's delivery worker
 * (`cashshop/server/fulfilment.ts`), which runs under Bun with no engine
 * behind it and so cannot import `store.ts`. One implementation on purpose:
 * the client draws occupancy with this loop, and a server that placed an item
 * where the client computes something else would draw two items on one
 * square.
 *
 * A port of the original's `FindEmptySlot`: `InventoryConstants` geometry,
 * every footprint marked from its top-left square and clipped at the grid's
 * edges, then a row-major, top-left-anchored first fit. Not a smarter packer,
 * for the reason above.
 */

export interface Footprint {
  /** The item's slot in the storage, counted from the first equipment slot. */
  slot: number;
  width: number;
  height: number;
}

/**
 * The first grid slot where a `width` x `height` item fits among `occupied`,
 * in a grid of `rows` rows below the twelve equipment slots; -1 when none
 * does. Footprints outside the grid - equipment, extension rows the grid does
 * not cover, the personal store - are ignored.
 */
export function findFreeSlot(
  occupied: readonly Footprint[],
  rows: number,
  width: number,
  height: number
): number {
  const columns = InventoryConstants.RowSize;
  const first = InventoryConstants.LastEquippableItemSlotIndex + 1;
  const used = new Uint8Array(columns * rows);

  for (const item of occupied) {
    const square = item.slot - first;
    if (square < 0 || square >= columns * rows) continue;
    const column = square % columns;
    const row = (square - column) / columns;
    for (let y = 0; y < item.height; y++) {
      for (let x = 0; x < item.width; x++) {
        if (column + x < columns && row + y < rows) {
          used[(row + y) * columns + column + x] = 1;
        }
      }
    }
  }

  for (let row = 0; row + height <= rows; row++) {
    for (let column = 0; column + width <= columns; column++) {
      let fits = true;
      for (let y = 0; y < height && fits; y++) {
        for (let x = 0; x < width; x++) {
          if (used[(row + y) * columns + column + x]) {
            fits = false;
            break;
          }
        }
      }
      if (fits) return first + row * columns + column;
    }
  }

  return -1;
}
