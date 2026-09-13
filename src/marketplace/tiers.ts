import type { Listing } from './mockListings';

/**
 * How a listing looks, from what its item is.
 *
 * The original game tells a player's eye what an item is worth before they
 * read a word: an excellent item's name is blue, an ancient's is gold, and a
 * high-level item glows. The window does the same on its cards and rows.
 * Two independent things decide it:
 *
 * - the **tier**, from the item's level: plain up to +3, forged from +4,
 *   high from +7 (where the original starts its glow), elite from +10;
 * - the **kind**: excellent or ancient, which get a foil edge and sparkles
 *   whatever their level.
 *
 * Pure, so the mapping is tested and the styling is only ever one class
 * per axis - `tier-high is-excellent`, never a pile of ad hoc flags.
 */

export type Tier = 'plain' | 'forged' | 'high' | 'elite';

export function tierOf(level: number | undefined): Tier {
  const lvl = level ?? 0;
  if (lvl >= 10) return 'elite';
  if (lvl >= 7) return 'high';
  if (lvl >= 4) return 'forged';
  return 'plain';
}

/** The classes a card or row carries for this item; empty for a plain one. */
export function lookClasses(item: Listing['item']): string {
  const classes: string[] = [];
  const tier = tierOf(item.lvl);
  if (tier !== 'plain') classes.push(`tier-${tier}`);
  if (item.isAncient) classes.push('is-ancient');
  else if (item.isExcellent) classes.push('is-excellent');
  return classes.join(' ');
}
