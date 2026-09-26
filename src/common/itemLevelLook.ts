import { t, type TextKey } from '../i18n';
import { itemBaseName } from './itemsDatabase';

/**
 * Items the original shows as another item at one level: Scroll of the
 * Emperor +1 is the Ring of Honor (`MODEL_EVENT + 12`) and Broken Sword +1 the
 * Dark Stone (`MODEL_EVENT + 13`). They take their own name without a level
 * (`GetItemName`, ZzzInventory.cpp:1593-1609) and their own model in the bag
 * (ZzzInventory.cpp:10186-10209); the ground model is `dropModelProxy.ts`.
 */
export type ItemLevelLook = {
  nameKey: TextKey;
  /** `public/items/<icon>.png`, rendered from the swapped model. */
  icon: string;
};

const LEVEL_LOOKS: Readonly<Record<string, ItemLevelLook>> = {
  '14_23_1': { nameKey: 'item.ringOfGlory', icon: 'item_14_23_1' },
  '14_24_1': { nameKey: 'item.darkStone', icon: 'item_14_24_1' },
};

export function itemLevelLook(
  group: number,
  num: number,
  lvl: number | undefined
): ItemLevelLook | null {
  return LEVEL_LOOKS[`${group}_${num}_${lvl ?? 0}`] ?? null;
}

/** "Short Sword +4", or the swapped item's own name with no level. */
export function itemLevelName(
  group: number,
  num: number,
  lvl: number | undefined,
  base: string = itemBaseName(group, num)
): string {
  const look = itemLevelLook(group, num, lvl);
  if (look) return t(look.nameKey);
  return lvl ? `${base} +${lvl}` : base;
}
