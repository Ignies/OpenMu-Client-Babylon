import items from '../../src/common/items.json';
import { hasItemIconFile } from '../../src/common/itemIconPack';

/**
 * The gacha roll: a random armour piece, +0 to +12, usually plain and now and
 * then excellent.
 *
 * The tier is the thing rolled. It is drawn first from a weight table, and it
 * decides everything else about the piece: the level range, whether it is
 * excellent at all, and how many options it carries. The old shape - draw a
 * level, derive a label from it, stamp every piece excellent - is inverted
 * because the tier is what the reveal shows, what the player remembers and
 * what an operator tunes; the level is a consequence of it.
 *
 * Rolled from a seed and nothing else, so a roll can be replayed exactly from
 * what the order stored. That matters twice: a player disputing a result can be
 * shown the same roll reproduced, and the reveal the page plays is the server's
 * answer rather than something the page made up. The roll is drawn and
 * committed when the order is placed, so from the first real order on the
 * tables and the draw order below are part of the replay contract.
 *
 * The same function serves fulfilment's audit trail and, in development, the
 * preview. A preview spends nothing and writes nothing.
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
 * Every armour piece the icon pack can draw both plain and excellent, at every
 * tint. Both filters stay because a roll can land either way: a plain roll
 * needs the plain icon, an excellent roll the excellent one.
 *
 * Filtered rather than listed: the pack is uneven, and a rolled item with no
 * icon would be a blank square at the one moment the page is trying to be
 * exciting. The game's own configuration is the other list an item has to be
 * on, and placement checks each roll against it before committing the seed
 * (`Orders.grantableRoll`), rolling again on a miss - so a paid roll is never
 * one the game cannot hand over.
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

export type Tier = 'common' | 'rare' | 'epic' | 'legendary';

export interface TierSpec {
  tier: Tier;
  /** Per 1000 pulls. */
  weight: number;
  /** Inclusive; drawn uniformly. */
  levels: [min: number, max: number];
  excellent: boolean;
  /** Inclusive; drawn uniformly. [0, 0] for a plain piece. */
  options: [min: number, max: number];
}

/**
 * The economic lever of the whole shop, per 1000 pulls. Common is the usual
 * and plain outcome; rare is a good plain piece (a +9 costs about six Bless
 * and six Soul by hand); epic and legendary are the only excellent ones, and
 * legendary sits at the levels the Chaos Machine charges for - +10 and above
 * normally costs attempts that reset the item on failure, and an excellent
 * one cannot be made at all, only dropped. Excellent overall is 6.5%, one in
 * about fifteen pulls; legendary is one in two hundred.
 *
 * Levels and option counts are uniform inside a tier, so the weights carry
 * all the shaping and these four lines are the whole table. Tune here and
 * nowhere else - and only with the replay contract in mind, because every
 * committed seed replays through whatever is written here.
 */
export const TIERS: TierSpec[] = [
  { tier: 'common', weight: 700, levels: [0, 4], excellent: false, options: [0, 0] },
  { tier: 'rare', weight: 235, levels: [5, 9], excellent: false, options: [0, 0] },
  { tier: 'epic', weight: 60, levels: [3, 9], excellent: true, options: [1, 2] },
  { tier: 'legendary', weight: 5, levels: [10, 12], excellent: true, options: [2, 3] },
];

const TIER_TABLE: [TierSpec, number][] = TIERS.map(spec => [spec, spec.weight]);

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

function uniformInt(next: () => number, [min, max]: [number, number]): number {
  return min + Math.floor(next() * (max - min + 1));
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
  tier: Tier;
  /** Decided by the tier, never by the level. */
  excellent: boolean;
  /** Empty for a plain piece. */
  options: string[];
}

export function newSeed(): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0];
}

/**
 * The roll. Same seed in, same item out, for as long as the tables hold.
 *
 * The draw order is the replay contract, and every draw consumes exactly one
 * number from the generator whether or not its result is used:
 *
 *   1. the pool entry, uniform over GACHA_POOL in items.json order;
 *   2. the tier, weighted by TIERS;
 *   3. the level, uniform over the tier's range;
 *   4. the option count, uniform over the tier's range - a plain tier's range
 *      is [0, 0], and the draw still happens, so every roll has consumed the
 *      same four numbers by this point;
 *   5. the options, without replacement from EXCELLENT_OPTIONS, one draw each.
 *
 * Reordering these, or growing the pool anywhere but at its end, changes what
 * a stored seed replays to.
 */
export function roll(seed: number): Roll {
  if (GACHA_POOL.length === 0) {
    throw new Error('gacha: no armour in the pool has both plain and excellent icons');
  }

  const next = rng(seed);
  const entry = GACHA_POOL[Math.floor(next() * GACHA_POOL.length)];
  const spec = weighted(next, TIER_TABLE);
  const level = uniformInt(next, spec.levels);
  const count = uniformInt(next, spec.options);

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
    tier: spec.tier,
    excellent: spec.excellent,
    options: options.sort(),
  };
}

/**
 * One line for the audit log, with everything a person needs to recognise
 * the piece and everything a replay needs to check it:
 *
 *   seed 2864434397 legendary: Excellent Dragon Armor +11 (8/1, 2x3) [Damage decrease +4%, Reflect damage +5%]
 */
export function describeRoll(roll: Roll): string {
  const name = `${roll.excellent ? 'Excellent ' : ''}${roll.name} +${roll.level}`;
  const shape = `${roll.group}/${roll.num}, ${roll.width}x${roll.height}`;
  const options = roll.options.length > 0 ? ` [${roll.options.join(', ')}]` : '';

  return `seed ${roll.seed} ${roll.tier}: ${name} (${shape})${options}`;
}
