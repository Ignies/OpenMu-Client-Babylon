import type { Item } from '../../ecs/world';
import { hasItemIconFile, type Variant } from './itemIconFiles';
import { itemLevelLook } from '../../modules/items/itemLevelLook';

/**
 * The pre-rendered item icon pack (`public/items/item_<group>_<num>_<tint>[_e|_a].png`),
 * checked against the manifest (`itemIconFiles.ts`), and a warm-up for it. See assets/readme.md.
 */

function itemIconTint(lvl: number): number {
  if (lvl < 3) return 0;
  if (lvl < 5) return 3;
  if (lvl < 7) return 5;
  if (lvl < 9) return 7;
  if (lvl < 11) return 9;
  if (lvl < 13) return 11;
  if (lvl < 15) return 13;
  return 15;
}

function packUrl(group: number, num: number, tint: number, variant: Variant): string {
  return `/items/item_${group}_${num}_${tint}${variant}.png`;
}

/**
 * The files to try for this item, best first, restricted to the ones that
 * exist: the exact tint and variant, then the tint dropped, then the
 * variant dropped, then both. Empty when the item has no icon at all - the
 * caller shows the missing-icon square straight away instead of 404ing.
 */
export function itemIconPackChain(item: Item): string[] {
  const { group, num } = item;
  const look = itemLevelLook(group, num, item.lvl);
  const tint = itemIconTint(item.lvl ?? 0);
  const variant: Variant = item.isExcellent ? '_e' : item.isAncient ? '_a' : '';

  const candidates: [number, Variant][] = [[tint, variant]];
  if (tint !== 0) candidates.push([0, variant]);
  if (variant !== '') {
    candidates.push([tint, '']);
    if (tint !== 0) candidates.push([0, '']);
  }

  const urls: string[] = look ? [`/items/${look.icon}.png`] : [];
  for (const [t, v] of candidates) {
    if (hasItemIconFile(group, num, t, v)) urls.push(packUrl(group, num, t, v));
  }
  return urls;
}

/** The first file of the chain: what the icon will show, or `null` for none. */
export function itemIconUrl(item: Item): string | null {
  return itemIconPackChain(item)[0] ?? null;
}

/**
 * Identity of an item's icon - every field the file name depends on. Used
 * as the React key / effect dependency so a durability tick on the same
 * item does not restart its load.
 */
export function itemIconKey(item: Item): string {
  const look = itemLevelLook(item.group, item.num, item.lvl);
  if (look) return look.icon;
  return `${item.group}_${item.num}_${itemIconTint(item.lvl ?? 0)}${
    item.isExcellent ? '_e' : item.isAncient ? '_a' : ''
  }`;
}

/**
 * Pinned so the browser's memory cache keeps the decoded file. Bounded: a
 * long session through vault, shops and trades would otherwise pin every
 * icon ever seen (8 k files, 65 MB on disk). Insertion-ordered `Map` as an
 * LRU - a hit is re-inserted at the end, the oldest entry is dropped past
 * the cap.
 */
const WARM_CAP = 512;
const warmed = new Map<string, HTMLImageElement>();

/** Start loading the icons of these items now, ahead of the grid that shows them. */
export function prefetchItemIcons(
  items: Iterable<Item | null | undefined>
): void {
  if (typeof Image === 'undefined') return;

  for (const item of items) {
    if (!item) continue;
    const url = itemIconUrl(item);
    if (!url) continue;

    const hit = warmed.get(url);
    if (hit) {
      warmed.delete(url);
      warmed.set(url, hit);
      continue;
    }

    const img = new Image();
    // Not in @types/react 18 / lib.dom of this TS: set as a plain property.
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
    img.decoding = 'async';
    img.src = url;
    warmed.set(url, img);

    if (warmed.size > WARM_CAP) {
      const oldest = warmed.keys().next().value;
      if (oldest !== undefined) warmed.delete(oldest);
    }
  }
}
