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
 * That last point bounds every price here. A jewel is one inventory square
 * and nothing stacks, and the wallet the service checks is the database
 * inventory plus vault - 64 squares (up to 192 extended) and 120 - so a
 * price is paid in squares rather than in value, and a three-figure price is
 * one nobody can carry.
 *
 * The prices below sit far under that ceiling: a session's pickups covers
 * any single one of them. That is deliberate, and it moves the work of
 * bounding what the shop gives away off the price and onto the daily caps -
 * one pair of wings a day whatever the buyer has banked. A cap is the honest
 * lever for that, because a rich player cannot defeat it, and it is the
 * number to change first if the shop turns out to be too generous.
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

export type ProductLine = 'wings' | 'quest' | 'gacha';

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
  // Level 1 wings. A Chaos Machine milestone - a chaos weapon mix and then
  // the wing mix, 40-50M zen in expectation plus the failed ingredients -
  // sold here as a shortcut priced within a day's pickups rather than at what
  // those mixes cost. The one a day is therefore what keeps wings from
  // flooding a server where they are the first big goal: the cap is the lever
  // on this line, not the number beside it. Fairy sits a step under the other
  // three. Big footprints, too - Wings of Angel is 5x3 in an 8-wide grid.
  { line: 'wings', group: 12, number: 0, chaos: 9, dailyCap: 1 },
  { line: 'wings', group: 12, number: 1, chaos: 12, dailyCap: 1 },
  { line: 'wings', group: 12, number: 2, chaos: 12, dailyCap: 1 },
  { line: 'wings', group: 13, number: 30, chaos: 12, dailyCap: 1 },

  // The second and third quest chains: convenience buys for drops people
  // otherwise farm for hours, at a few jewels each so a session's pickups
  // covers several. The second chain's pieces are each wanted once, which is
  // what the cap of five is for; the third's are wanted in quantity, and five
  // Symbols make a Lost Map.
  //
  // Devil Eye, Devil Key and Symbol of Kundun are sold at level 0, and in
  // Season 6 those are +1..+7 tickets - level 0 is not a ticket the game
  // recognises. Priced as they stand; the level is a separate decision.
  { line: 'quest', group: 14, number: 23, chaos: 5, dailyCap: 5 },
  { line: 'quest', group: 14, number: 24, chaos: 4, dailyCap: 5 },
  { line: 'quest', group: 14, number: 25, chaos: 4, dailyCap: 5 },
  { line: 'quest', group: 14, number: 26, chaos: 4, dailyCap: 5 },
  { line: 'quest', group: 14, number: 17, chaos: 3, dailyCap: 10 },
  { line: 'quest', group: 14, number: 18, chaos: 3, dailyCap: 10 },
  { line: 'quest', group: 14, number: 29, chaos: 5, dailyCap: 10 },
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
 * Ten chaos is ten squares, still payable straight from the bag, and about a
 * hunting session's pickups for a mid-level character. Twelve of them is 120
 * chaos, which takes a banked vault as well - but the cap is shaped by the
 * bag rather than the wallet: every roll is a 2x2 or 2x3 piece delivered at
 * logout into the same inventory, and twelve need about 51 free squares of
 * 64. This is the one line whose price does the bounding rather than its cap,
 * because it is the only thing here bought for its own sake rather than for
 * a fixed need.
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
  chaos: 10,
  dailyCap: 12,
  note: 'A random helm, armour, pants, gloves or boots, +0 to +12. Most are plain; some are excellent.',
};

export const CATALOG: Product[] = [...SPECS.map(build), GACHA];

export const LINES: { id: ProductLine; label: string }[] = [
  { id: 'wings', label: 'Wings' },
  { id: 'quest', label: 'Quest Items' },
  { id: 'gacha', label: 'Gacha' },
];

export function productById(id: string): Product | undefined {
  return CATALOG.find(product => product.id === id);
}
