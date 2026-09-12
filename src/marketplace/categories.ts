import type { Item } from '../ecs/world';
import { ItemsDatabase, itemBaseName } from '../common/itemsDatabase';
import { t, type TextKey } from '../i18n';

/**
 * Categories are derived from the item database rather than hand listed, so a
 * new item falls into a rail without anyone maintaining a taxonomy. The only
 * hand work is the few index ranges inside groups 12 to 14, where MU mixes
 * wings, orbs, jewels and quest drops into one group.
 */
export type CategoryId =
  | 'all'
  | 'weapons'
  | 'shields'
  | 'armour'
  | 'wings'
  | 'jewels'
  | 'pets'
  | 'accessories'
  | 'consumables'
  | 'misc';

export const CATEGORIES: readonly {
  readonly id: CategoryId;
  readonly labelKey: TextKey;
}[] = [
  { id: 'all', labelKey: 'marketplace.cat.all' },
  { id: 'weapons', labelKey: 'marketplace.cat.weapons' },
  { id: 'shields', labelKey: 'marketplace.cat.shields' },
  { id: 'armour', labelKey: 'marketplace.cat.armour' },
  { id: 'wings', labelKey: 'marketplace.cat.wings' },
  { id: 'jewels', labelKey: 'marketplace.cat.jewels' },
  { id: 'pets', labelKey: 'marketplace.cat.pets' },
  { id: 'accessories', labelKey: 'marketplace.cat.accessories' },
  { id: 'consumables', labelKey: 'marketplace.cat.consumables' },
  { id: 'misc', labelKey: 'marketplace.cat.misc' },
];


const WING_INDEXES = new Set([0, 1, 2, 3, 4, 5, 6, 36, 37, 38, 39, 40, 41, 42, 43]);
const PET_INDEXES = new Set([0, 1, 2, 3, 4, 5]);
/** Capes sit with wings: same slot, same reason to shop for one. */
const CAPE_INDEXES = new Set([30]);
const ACCESSORY_INDEXES = new Set([8, 9, 10, 12, 13, 20, 21, 22, 23, 24, 25, 26, 27, 28]);
/** Group 14 jewels: Bless, Soul, Life, Creation, Guardian. */
const JEWEL_14 = new Set([13, 14, 16, 22, 31]);
/** Group 12 jewels: Chaos, and the compressed Bless / Soul. */
const JEWEL_12 = new Set([15, 30, 31]);

export function categoryOf(item: Item): CategoryId {
  const { group, num } = item;
  if (group <= 5) return 'weapons';
  if (group === 6) return 'shields';
  if (group >= 7 && group <= 11) return 'armour';
  if (group === 12) {
    if (WING_INDEXES.has(num)) return 'wings';
    if (JEWEL_12.has(num)) return 'jewels';
    return 'misc';
  }
  if (group === 13) {
    if (CAPE_INDEXES.has(num)) return 'wings';
    if (PET_INDEXES.has(num)) return 'pets';
    if (ACCESSORY_INDEXES.has(num)) return 'accessories';
    return 'misc';
  }
  if (group === 14) {
    if (JEWEL_14.has(num)) return 'jewels';
    return 'consumables';
  }
  if (group === 15) return 'consumables';
  return 'misc';
}

export function itemName(item: Item): string {
  return (
    itemBaseName(item.group, item.num) ||
    t('quest.itemFallback', { id: item.group * 512 + item.num })
  );
}

/** Grid footprint, for the card's icon box. */
export function itemFootprint(item: Item): { x: number; y: number } {
  const def = ItemsDatabase.getItem(item.group, item.num);
  return { x: def?.X ?? 1, y: def?.Y ?? 1 };
}

/**
 * The name a player reads on a card: the base name with the upgrade level and
 * the excellent / ancient markers the tooltip would also show.
 */
export function displayName(item: Item): string {
  const base = itemName(item);
  const level = item.lvl ? ` +${item.lvl}` : '';
  if (item.isAncient) return `${t('item.ancientPrefix', { name: base })}${level}`;
  if (item.isExcellent) return `${t('item.excellentPrefix', { name: base })}${level}`;
  return `${base}${level}`;
}
