import type { Item } from '../../ecs/world';
import { itemSetTables, type ItemSet, type ItemSetTables } from '../assets/mu';
import { classCanUse, itemStats, type HeroStats } from './itemStats';

/** `MAX_SUBTYPE`: the stride between two groups in the item code. */
const GROUP_STRIDE = 512;
/** An empty option slot in the set file. */
const EMPTY = 0xff;
/** The worn slots `CheckItemSetOptions` reads: all but the wings (7) and the pet (8). */
const SET_SLOTS = [0, 1, 2, 3, 4, 5, 6, 9, 10, 11];
/** Right weapon / right ring: the left one of the same item counts once. */
const PAIRED = new Map([
  [1, 0],
  [11, 10],
]);

/** The set the ancient discriminator puts an item in (`GetSetItemName`, CSItemOption.cpp:216-235). */
export function ancientSetOf(item: Item, tables?: ItemSetTables | null): ItemSet | null {
  const kind = (item.ancientDiscriminator ?? 0) % 4;
  if (kind < 1 || kind > 2) return null;
  const sets = tables === undefined ? itemSetTables() : tables;
  if (!sets) return null;
  const number = sets.setOf[(item.group * GROUP_STRIDE + item.num) * 2 + kind - 1];
  return number !== 0 && number !== EMPTY ? sets.sets[number] ?? null : null;
}

/**
 * How many pieces of `set` the hero wears with durability left and its requirements met
 * (`CheckItemSetOptions`, CSItemOption.cpp:839-906). The requirements are checked against the
 * hero's own stats, without what the sets themselves add.
 */
export function wornSetPieces(set: ItemSet, worn: readonly (Item | null)[], hero: HeroStats, tables: ItemSetTables | null = itemSetTables()): number {
  let pieces = 0;
  for (const slot of SET_SLOTS) {
    const item = worn[slot];
    if (!item || ancientSetOf(item, tables) !== set || (item.durability ?? 1) <= 0) continue;
    const pair = PAIRED.get(slot);
    const other = pair === undefined ? null : worn[pair];
    if (other && other.group === item.group && other.num === item.num && other.ancientDiscriminator === item.ancientDiscriminator) continue;
    const stats = itemStats(item);
    if (!stats || !classCanUse(stats.def, hero)) continue;
    if (stats.reqLvl > hero.level || stats.reqStr > hero.str || stats.reqAgi > hero.agi || stats.reqEne > hero.ene || stats.reqCmd > hero.cmd) continue;
    pieces++;
  }
  return pieces;
}

export type SetOptionLine = {
  option: number;
  value: number;
  active: boolean;
  kind: 'standard' | 'ext' | 'full';
};

/**
 * `calcSetOptionList` (CSItemOption.cpp:316-372) for one set with `pieces` worn: one standard
 * option per piece past the first, the ext options, then the full-set options. Empty under two
 * pieces, as the original keeps no list for such a set.
 */
export function setOptionLines(set: ItemSet, pieces: number): SetOptionLine[] {
  if (pieces < 2) return [];
  const complete = set.itemCount <= pieces;
  const out: SetOptionLine[] = [];
  const add = (option: number, value: number, index: number, kind: SetOptionLine['kind']) => {
    if (option === EMPTY || value === 0) return;
    out.push({ option, value, kind, active: complete || index < pieces - 1 });
  };
  const rows = Math.min(set.itemCount - 1, set.standard.length);
  for (let row = 0; row < rows; row++) for (const { option, value } of set.standard[row]) add(option, value, row, 'standard');
  for (const { option, value } of set.ext) add(option, value, 0, 'ext');
  for (const { option, value } of set.full) add(option, value, Infinity, 'full');
  return out;
}
