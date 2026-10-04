import { localisedItemName } from '@/controllers/assets/mu';
import type { ItemRecord } from '@/controllers/items';
import { items } from './all';

/** The items area's lookups over the item files (`<group>/<item>.ts`, one per item). */
export const ItemsDatabase = {
  getItem(group: number, id: number): ItemRecord | null {
    return items.get(group, id);
  },

  /** Every item, in (group, index) order. */
  all(): readonly ItemRecord[] {
    return items.all();
  },
};

/**
 * What to print for an item: the active language pack's name when it has one
 * (`Local/<lang>/item_<lang>.bmd`), else the English name the item file
 * carries. Everything that keys on an item still reads `ItemName`; this is
 * only what the player reads.
 */
export function itemBaseName(group: number, index: number): string {
  return (
    localisedItemName(group, index) ??
    ItemsDatabase.getItem(group, index)?.ItemName ??
    ''
  );
}
