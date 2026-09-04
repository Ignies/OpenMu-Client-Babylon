import items from '../../src/common/items.json';
import { hasItemIconFile } from '../../src/common/itemIconPack';

/**
 * The gacha roll: a random armour piece, always excellent, +1 to +12, with one
 * to three excellent options.
 *
 * Rolled from a seed and nothing else, so a roll can be replayed exactly from
 * what the order stored. That matters twice: a player disputing a result can be
 * shown the same roll reproduced, and the reveal the page plays is the server's
 * answer rather than something the page made up.
 *
 * The same function serves the preview and, later, fulfilment. A preview
 * spends nothing and writes nothing - it exists so the reveal can be built and
 * watched before any of it is real.
 */

interface ItemRow {
  Group: number;
  Index: number;
  ItemName: string;
  X: number;
  Y: number;
}

/** Helm, armour, pants, gloves, boots. */
const ARMOUR_GROUPS = [7, 8, 9, 10, 11];

const GROUP_LABEL: Record<number, string> = {
  7: 'Helm',
  8: 'Armour',
  9: 'Pants',
  10: 'Gloves',
  11: 'Boots',
};

export interface PoolEntry {
  group: number;
  num: number;
  name: string;
  slot: string;
  width: number;
  height: number;
}

/**
 * Every armour piece the icon pack can actually draw excellent, at every tint.
 *
 * Filtered rather than listed: the pack is uneven, and a rolled item with no
 * icon would be a blank square at the one moment the page is trying to be
 * exciting. Fulfilment will filter on OpenMU's item definitions too - an item
 * has to exist in the game's configuration to be granted - and the two lists
 * are intersected there.
 */
export const GACHA_POOL: PoolEntry[] = (items as unknown as ItemRow[])
  .filter(row => ARMOUR_GROUPS.includes(row.Group))
  .filter(row => typeof row.ItemName === 'string' && row.ItemName.length > 0)
  .filter(row => hasItemIconFile(row.Group, row.Index, 15, '_e'))
  .filter(row => hasItemIconFile(row.Group, row.Index, 0, ''))
  .map(row => ({
    group: row.Group,
    num: row.Index,
    name: row.ItemName,
    slot: GROUP_LABEL[row.Group] ?? 'Armour',
    width: row.X,
    height: row.Y,
  }));

/**
 * The six excellent options a defensive item can carry in Season 6. Which of
 * them a given definition actually offers comes from its own
 * `PossibleItemOptions` at fulfilment; these are the labels the reveal shows.
 */
export const EXCELLENT_OPTIONS = [
  'Increase Zen after hunt +40%',
  'Defense success rate +10%',
  'Reflect damage +5%',
  'Damage decrease +4%',
  'Increase maximum mana +4%',
  'Increase maximum life +4%',
];

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export function rarityOf(level: number): Rarity {
  if (level >= 10) return 'legendary';
  if (level >= 7) return 'epic';
  if (level >= 4) return 'rare';
  return 'common';
}

/**
 * Level weights, heavily front-loaded. This is the economic lever of the whole
 * shop: a guaranteed-excellent +10 or better is worth far more than the jewels
 * it costs, so the tail is deliberately thin. Tune here and nowhere else.
 */
const LEVEL_WEIGHTS: [level: number, weight: number][] = [
  [1, 260],
  [2, 210],
  [3, 170],
  [4, 130],
  [5, 95],
  [6, 65],
  [7, 40],
  [8, 22],
  [9, 12],
  [10, 6],
  [11, 3],
  [12, 1],
];

/** How many excellent options, by weight. */
const OPTION_COUNT_WEIGHTS: [count: number, weight: number][] = [
  [1, 70],
  [2, 25],
  [3, 5],
];

/**
 * mulberry32: small, fast, and good enough that a player cannot predict the
 * next roll from the last. The seed is what gets stored, so the whole sequence
 * is reproducible from it.
 */
function rng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted<T>(next: () => number, table: [T, number][]): T {
  const total = table.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = next() * total;

  for (const [value, weight] of table) {
    roll -= weight;
    if (roll < 0) return value;
  }

  return table[table.length - 1][0];
}

export interface Roll {
  seed: number;
  group: number;
  num: number;
  name: string;
  slot: string;
  width: number;
  height: number;
  level: number;
  rarity: Rarity;
  excellent: true;
  options: string[];
}

export function newSeed(): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0];
}

/** The roll. Same seed in, same item out, for as long as the tables hold. */
export function roll(seed: number): Roll {
  if (GACHA_POOL.length === 0) {
    throw new Error('gacha: no armour in the pool has excellent icons');
  }

  const next = rng(seed);
  const entry = GACHA_POOL[Math.floor(next() * GACHA_POOL.length)];
  const level = weighted(next, LEVEL_WEIGHTS);
  const count = weighted(next, OPTION_COUNT_WEIGHTS);

  // Draw without replacement: an item cannot carry the same option twice.
  const remaining = [...EXCELLENT_OPTIONS];
  const options: string[] = [];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    options.push(remaining.splice(Math.floor(next() * remaining.length), 1)[0]);
  }

  return {
    seed,
    group: entry.group,
    num: entry.num,
    name: entry.name,
    slot: entry.slot,
    width: entry.width,
    height: entry.height,
    level,
    rarity: rarityOf(level),
    excellent: true,
    options: options.sort(),
  };
}
