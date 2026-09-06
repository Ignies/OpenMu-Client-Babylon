import { ItemsDatabase } from './itemsDatabase';
import {
  isArmorPart,
  isJewel,
  isPendant,
  isRing,
  isShield,
  isWeapon,
  isWing,
  itemDef,
} from './itemStats';
import type { Item } from '../ecs/world';

/**
 * The packing behind the inventory's auto-arrange (`inventorySort.ts`):
 * where every item would sit if the grid were laid out from scratch.
 *
 * Kept apart from the run itself because this half is pure - a list of
 * occupied squares in, a slot per item out - so it can be reasoned about
 * (and tested) without a store, a socket or a server.
 */

export type Square = { slot: number; item: Item; w: number; h: number };

/** Grid footprint of an item, from its Item.txt row. */
export function itemSquares(item: Item): { w: number; h: number } {
  const config = ItemsDatabase.getItem(item.group, item.num);
  return { w: config?.X ?? 1, h: config?.Y ?? 1 };
}

/** `ITEM_GROUP_POTION`: the stacks that grow and shrink as you play. */
const POTION_GROUP = 14;

/** Kinds in the order they are packed: what a player looks for, first. */
export function itemCategory(item: Item): number {
  if (item.group === POTION_GROUP) return 5;
  const def = itemDef(item.group, item.num);
  if (!def) return 6;
  if (isJewel(def)) return 0;
  if (isWeapon(def) || isShield(def)) return 1;
  if (isWing(def)) return 2;
  if (isArmorPart(def)) return 3;
  if (isRing(def) || isPendant(def)) return 4;
  return 6;
}

/** Big items first inside a kind, so first-fit leaves no holes behind them. */
export function compareSquares(a: Square, b: Square): number {
  const ai = a.item;
  const bi = b.item;
  return (
    itemCategory(ai) - itemCategory(bi) ||
    b.h - a.h ||
    b.w - a.w ||
    ai.group - bi.group ||
    ai.num - bi.num ||
    (bi.lvl ?? 0) - (ai.lvl ?? 0) ||
    a.slot - b.slot
  );
}

export function stampSquares(
  used: Uint8Array,
  columns: number,
  rows: number,
  square: number,
  w: number,
  h: number
): void {
  const column = square % columns;
  const row = (square - column) / columns;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (column + x < columns && row + y < rows) {
        used[(row + y) * columns + column + x] = 1;
      }
    }
  }
}

export function squareFits(
  used: Uint8Array,
  columns: number,
  rows: number,
  square: number,
  w: number,
  h: number
): boolean {
  if (square < 0) return false;
  const column = square % columns;
  const row = (square - column) / columns;
  if (column + w > columns || row + h > rows) return false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (used[(row + y) * columns + column + x]) return false;
    }
  }
  return true;
}

/** Where every item wants to end up: first-fit, in `compareSquares` order. */
export function planLayout(
  squares: readonly Square[],
  columns: number,
  rows: number,
  first: number
): Map<number, number> {
  const used = new Uint8Array(columns * rows);
  const targets = new Map<number, number>();

  for (const entry of [...squares].sort(compareSquares)) {
    for (let square = 0; square < columns * rows; square++) {
      if (!squareFits(used, columns, rows, square, entry.w, entry.h)) continue;
      stampSquares(used, columns, rows, square, entry.w, entry.h);
      targets.set(entry.slot, first + square);
      break;
    }
  }

  return targets;
}
