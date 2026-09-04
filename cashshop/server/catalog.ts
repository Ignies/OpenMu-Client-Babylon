import items from '../../src/common/items.json';

/**
 * What the shop sells, and for how many jewels.
 *
 * Data, not code: prices and caps are meant to be tuned without touching
 * anything else. Names and grid footprints are looked up in the client's own
 * `items.json` rather than restated here, so the shop and the game can never
 * disagree about what an entry actually is.
 */

interface ItemRow {
  Group: number;
  Index: number;
  ItemName: string;
  X: number;
  Y: number;
}

const byKey = new Map<string, ItemRow>();

for (const row of items as unknown as ItemRow[]) {
  byKey.set(`${row.Group}/${row.Index}`, row);
}

export type ProductLine = 'wings' | 'quest' | 'boxes' | 'gacha';

export interface Product {
  id: string;
  line: ProductLine;
  name: string;
  /** Null for the gacha, which picks its item when the order is fulfilled. */
  group: number | null;
  number: number | null;
  level: number;
  width: number;
  height: number;
  bless: number;
  soul: number;
  /** Per account, per day. */
  dailyCap: number;
  note?: string;
}

interface Spec {
  line: ProductLine;
  group: number;
  number: number;
  level?: number;
  bless: number;
  soul: number;
  dailyCap: number;
  /** Overrides the name from `items.json`, for entries whose level renames them. */
  name?: string;
  note?: string;
}

const SPECS: Spec[] = [
  // Level 1 wings. Big footprints - Wings of Angel is 5x3 in an 8-wide grid.
  { line: 'wings', group: 12, number: 0, bless: 10, soul: 10, dailyCap: 2 },
  { line: 'wings', group: 12, number: 1, bless: 20, soul: 20, dailyCap: 2 },
  { line: 'wings', group: 12, number: 2, bless: 20, soul: 20, dailyCap: 2 },
  { line: 'wings', group: 13, number: 30, bless: 20, soul: 20, dailyCap: 2 },

  // The second and third quest chains.
  { line: 'quest', group: 14, number: 23, bless: 3, soul: 3, dailyCap: 5 },
  { line: 'quest', group: 14, number: 24, bless: 2, soul: 2, dailyCap: 5 },
  { line: 'quest', group: 14, number: 25, bless: 2, soul: 2, dailyCap: 5 },
  { line: 'quest', group: 14, number: 26, bless: 2, soul: 2, dailyCap: 5 },
  { line: 'quest', group: 14, number: 17, bless: 1, soul: 1, dailyCap: 10 },
  { line: 'quest', group: 14, number: 18, bless: 1, soul: 1, dailyCap: 10 },
  { line: 'quest', group: 14, number: 29, bless: 4, soul: 4, dailyCap: 5 },

  // Box of Luck is level 0; levels 1-5 are Box of Kundun +1..+5.
  { line: 'boxes', group: 14, number: 11, level: 0, bless: 1, soul: 1, dailyCap: 20 },
  { line: 'boxes', group: 14, number: 11, level: 1, name: 'Box of Kundun +1', bless: 3, soul: 3, dailyCap: 20 },
  { line: 'boxes', group: 14, number: 11, level: 2, name: 'Box of Kundun +2', bless: 5, soul: 5, dailyCap: 20 },
  { line: 'boxes', group: 14, number: 11, level: 3, name: 'Box of Kundun +3', bless: 8, soul: 8, dailyCap: 15 },
  { line: 'boxes', group: 14, number: 11, level: 4, name: 'Box of Kundun +4', bless: 12, soul: 12, dailyCap: 10 },
  { line: 'boxes', group: 14, number: 11, level: 5, name: 'Box of Kundun +5', bless: 18, soul: 18, dailyCap: 10 },
];

function build(spec: Spec): Product {
  const key = `${spec.group}/${spec.number}`;
  const row = byKey.get(key);

  if (!row) throw new Error(`catalog: no item ${key} in items.json`);

  const level = spec.level ?? 0;

  return {
    id: `${spec.line}-${spec.group}-${spec.number}-${level}`,
    line: spec.line,
    name: spec.name ?? row.ItemName,
    group: spec.group,
    number: spec.number,
    level,
    width: row.X,
    height: row.Y,
    bless: spec.bless,
    soul: spec.soul,
    dailyCap: spec.dailyCap,
    note: spec.note,
  };
}

/**
 * The gacha: one price, one roll, resolved at fulfilment rather than here so
 * the outcome is bound to a committed write and cannot be shopped for by
 * ordering and cancelling.
 *
 * The footprint is the largest an armour piece can be, because the free-slot
 * search has to reserve room before the item is known.
 */
const GACHA: Product = {
  id: 'gacha-armour',
  line: 'gacha',
  name: 'Excellent Armour Roll',
  group: null,
  number: null,
  level: 0,
  width: 2,
  height: 2,
  bless: 25,
  soul: 25,
  dailyCap: 10,
  note: 'A random helm, armour, pants, gloves or boots. Always excellent, +1 to +12, with 1 to 3 excellent options.',
};

export const CATALOG: Product[] = [...SPECS.map(build), GACHA];

export const LINES: { id: ProductLine; label: string }[] = [
  { id: 'wings', label: 'Wings' },
  { id: 'quest', label: 'Quest Items' },
  { id: 'boxes', label: 'Boxes' },
  { id: 'gacha', label: 'Gacha' },
];

export function productById(id: string): Product | undefined {
  return CATALOG.find(product => product.id === id);
}
