import items from '../../src/common/items.json';

/**
 * How many bag squares an item takes, by kind.
 *
 * The bag is a grid, and an item is a rectangle on it: a jewel is one
 * square, a sword one wide and two or three tall, a piece of armour two by
 * two or more. Whether a bot has room for a listing is a question about
 * rectangles, not about how many squares happen to be empty. The sizes come
 * from the item table the client draws from, `X` across and `Y` down.
 */

export type Footprint = { w: number; h: number };

const ONE: Footprint = { w: 1, h: 1 };

const sizes = new Map<string, Footprint>();
for (const entry of items as { Group: number; Index: number; X?: number; Y?: number }[]) {
  const w = Number(entry.X ?? 1);
  const h = Number(entry.Y ?? 1);
  sizes.set(`${entry.Group}/${entry.Index}`, { w: w > 0 ? w : 1, h: h > 0 ? h : 1 });
}

/** One square for anything the table does not know. */
export function footprintOf(group: number, num: number): Footprint {
  return sizes.get(`${group}/${num}`) ?? ONE;
}
