import items from '../../src/common/items.json';

/**
 * What the shop sells, and for how many Jewels of Chaos.
 *
 * Data, not code: prices and caps are meant to be tuned without touching
 * anything else. Names and grid footprints are looked up in the client's own
 * `items.json` rather than restated here, so the shop and the game can never
 * disagree about what an entry actually is.
 *
 * The one currency is the Jewel of Chaos (12/15). It is the right sink for
 * three reasons. It is the fuel of the Chaos Machine - every wing, every +10,
 * every fruit and feather mix burns one - so it already has a value the
 * server sets and every player understands. It is the common jewel: it drops
 * from Chaos Goblins, from boxes, from ordinary hunting, so a mid-level
 * character can pay the shop from a session's pickups where a Bless-and-Soul
 * price would gate the shop behind the rarest drops in the game. And it has
 * no compressed form (Bless and Soul do: 12/30 and 12/31), so unlike them it
 * piles up loose in bags and vaults with nowhere to go once a character's
 * mixes are done; a second use for it takes jewels out of the economy that
 * would otherwise sit or be dumped on the market for zen.
 *
 * That last point is also the ceiling on every price here. A jewel is one
 * inventory square and nothing stacks, and the wallet the service checks is
 * the database inventory plus vault - 64 squares (up to 192 extended) and
 * 120 - so prices are bounded by squares, not by value. The most expensive
 * product must be payable from a bag plus a banked vault; everyday products
 * from a bag alone. The old Bless-and-Soul prices converted at the client's
 * own sell-value table (`src/common/itemValue.ts`: Bless 9,000,000 zen, Soul
 * 6,000,000, Chaos 810,000) would put the gacha at 463 chaos, which nobody can
 * carry, so everything below is re-anchored to the square ceiling while
 * keeping the old relative shape: wings well above the box ladder, the box
 * ladder above the quest items.
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
  /** Null for the gacha, which picks its item when the order is placed. */
  group: number | null;
  number: number | null;
  level: number;
  width: number;
  height: number;
  /** Jewels of Chaos (12/15). One jewel is one inventory square, so the ceiling is squares, not value. */
  chaos: number;
  /** Per account, per day. */
  dailyCap: number;
  note?: string;
}

interface Spec {
  line: ProductLine;
  group: number;
  number: number;
  level?: number;
  chaos: number;
  dailyCap: number;
  /** Overrides the name from `items.json`, for entries whose level renames them. */
  name?: string;
  note?: string;
}

const SPECS: Spec[] = [
  // Level 1 wings. A Chaos Machine milestone - a chaos weapon mix and then the
  // wing mix, 40-50M zen in expectation plus the failed ingredients - sold
  // with certainty, so priced above what the mixes cost on average. One a
  // day each: a flood of wings is the worst thing the shop could do to a
  // server where wings are the first big goal. Big footprints, too - Wings of
  // Angel is 5x3 in an 8-wide grid.
  { line: 'wings', group: 12, number: 0, chaos: 90, dailyCap: 1 },
  { line: 'wings', group: 12, number: 1, chaos: 120, dailyCap: 1 },
  { line: 'wings', group: 12, number: 2, chaos: 120, dailyCap: 1 },
  { line: 'wings', group: 13, number: 30, chaos: 120, dailyCap: 1 },

  // The second and third quest chains: convenience buys for drops people
  // otherwise farm for hours. Devil Eye, Devil Key and Symbol of Kundun are
  // sold at level 0, and in Season 6 those are +1..+7 tickets - level 0 is
  // not a ticket the game recognises. Repriced as they stand; the level is
  // a separate decision. Five Symbols make a Lost Map, so ten is two maps.
  { line: 'quest', group: 14, number: 23, chaos: 12, dailyCap: 5 },
  { line: 'quest', group: 14, number: 24, chaos: 10, dailyCap: 5 },
  { line: 'quest', group: 14, number: 25, chaos: 10, dailyCap: 5 },
  { line: 'quest', group: 14, number: 26, chaos: 10, dailyCap: 5 },
  { line: 'quest', group: 14, number: 17, chaos: 4, dailyCap: 10 },
  { line: 'quest', group: 14, number: 18, chaos: 4, dailyCap: 10 },
  { line: 'quest', group: 14, number: 29, chaos: 8, dailyCap: 10 },

  // Box of Luck is level 0; levels 1-5 are Box of Kundun +1..+5. A ladder of
  // roughly x1.7 a step, so Box of Luck stays an impulse buy and +5 (Kundun's
  // own drop, excellent-tier loot) stays a real purchase; caps shrink up the
  // ladder for the same reason the price grows.
  { line: 'boxes', group: 14, number: 11, level: 0, chaos: 5, dailyCap: 20 },
  { line: 'boxes', group: 14, number: 11, level: 1, name: 'Box of Kundun +1', chaos: 12, dailyCap: 20 },
  { line: 'boxes', group: 14, number: 11, level: 2, name: 'Box of Kundun +2', chaos: 20, dailyCap: 15 },
  { line: 'boxes', group: 14, number: 11, level: 3, name: 'Box of Kundun +3', chaos: 35, dailyCap: 10 },
  { line: 'boxes', group: 14, number: 11, level: 4, name: 'Box of Kundun +4', chaos: 60, dailyCap: 5 },
  { line: 'boxes', group: 14, number: 11, level: 5, name: 'Box of Kundun +5', chaos: 100, dailyCap: 3 },
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
    chaos: spec.chaos,
    dailyCap: spec.dailyCap,
    note: spec.note,
  };
}

/**
 * The gacha: one price, one roll, rolled and committed when the order is
 * placed, so the outcome is bound to a stored seed before the player sees it
 * and cannot be shopped for by ordering and cancelling.
 *
 * Five chaos is five squares, always payable straight from the bag, about a
 * hunting session's pickups for a mid-level character; twelve a day is 60
 * chaos, a serious day of farming. The cap is shaped by the bag rather than
 * the wallet: every roll is a 2x2 or 2x3 piece delivered at logout into the
 * same inventory, and twelve of them need about 51 free squares of 64.
 *
 * The 2x2 here is only the catalogue tile. The real footprint is the roll's
 * own width and height, known at placement, and that is what fulfilment fits
 * - 31 of the 54 body armours in the pool are 2x3.
 */
const GACHA: Product = {
  id: 'gacha-armour',
  line: 'gacha',
  name: 'Chaos Armour Roll',
  group: null,
  number: null,
  level: 0,
  width: 2,
  height: 2,
  chaos: 5,
  dailyCap: 12,
  note: 'A random helm, armour, pants, gloves or boots, +0 to +12. Most are plain; some are excellent.',
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
