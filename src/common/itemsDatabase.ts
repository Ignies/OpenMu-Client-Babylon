import items from './items.json';
import { localisedItemName } from '../libs/mu/itemNameFile';

export const ItemsDatabase = new (class _ItemsDatabase {
  cache: Record<number, Record<number, (typeof items)[number]>> = {};

  constructor() {
    for (const item of items) {
      if (!this.cache[item.Group]) {
        this.cache[item.Group] = {};
      }
      this.cache[item.Group][item.Index] = item;
    }
  }

  getItem(group: number, id: number) {
    return this.cache[group]?.[id] || null;
  }
})();

/**
 * What to print for an item: the active language pack's name when it has one
 * (`Local/<lang>/item_<lang>.bmd`), else the English name the JSON table
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
