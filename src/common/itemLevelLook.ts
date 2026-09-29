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
  /** Its own name, shown without the item's level. Absent: the item's own name and level. */
  nameKey?: TextKey;
  /** A level of its own after that name - the Box of Kundun +1 is a Box of Luck +8. */
  shownLevel?: number;
  /** `public/items/<icon>.png`, rendered from the swapped model. */
  icon: string;
};

const LEVEL_LOOKS: Record<string, ItemLevelLook> = {
  '14_23_1': { nameKey: 'item.ringOfGlory', icon: 'item_14_23_1' },
  '14_24_1': { nameKey: 'item.darkStone', icon: 'item_14_24_1' },
};

/**
 * The Box of Luck is a dozen event items by level, each named
 * (`GetItemName`, ZzzInventory.cpp:1418-1445) and drawn (`RenderItem3D`,
 * ZzzInventory.cpp:6791-6822) as its own. The icon pack has one picture per
 * level, so none of them can share the +3 / +5 / ... tints the rest of the
 * pack is drawn at. Level 4 has no name of its own and stays the box.
 */
const BOX_OF_LUCK: Readonly<Record<number, TextKey>> = {
  1: 'item.starOfSacredBirth',
  2: 'item.firecracker',
  3: 'item.heartOfLove',
  5: 'item.silverMedal',
  6: 'item.goldMedal',
  7: 'item.boxOfHeaven',
  13: 'item.heartOfDarkLord',
  14: 'item.blueLuckyPouch',
  15: 'item.redLuckyPouch',
};
/** Box of Kundun +1..+5 are the Box of Luck +8..+12. */
const BOX_OF_KUNDUN_FIRST = 8;
const BOX_OF_KUNDUN_LAST = 12;

for (let lvl = 1; lvl <= 15; lvl++) {
  const icon = `item_14_11_${lvl}`;
  LEVEL_LOOKS[`14_11_${lvl}`] =
    lvl >= BOX_OF_KUNDUN_FIRST && lvl <= BOX_OF_KUNDUN_LAST
      ? { nameKey: 'item.boxOfKundun', shownLevel: lvl - BOX_OF_KUNDUN_FIRST + 1, icon }
      : { nameKey: BOX_OF_LUCK[lvl], icon };
}

/**
 * The Weapon of Archangel is the Archangel's staff, sword or crossbow by level:
 * named for it in the bag (`RenderItemInfo`, ZzzInventory.cpp:3180-3188) and
 * drawn as that Divine weapon (ZzzInventory.cpp:6901-6912). The pack only
 * rendered the staff, so the sword and crossbow borrow the Divine weapons'
 * own icons.
 */
const WEAPON_OF_ARCHANGEL: readonly ItemLevelLook[] = [
  { nameKey: 'item.absoluteStaffOfArchangel', icon: 'item_13_19_0' },
  { nameKey: 'item.absoluteSwordOfArchangel', icon: 'item_0_19_0' },
  { nameKey: 'item.absoluteCrossbowOfArchangel', icon: 'item_4_18_0' },
];
WEAPON_OF_ARCHANGEL.forEach((look, lvl) => {
  LEVEL_LOOKS[`13_19_${lvl}`] = look;
});

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
  if (look?.nameKey) {
    const name = t(look.nameKey);
    return look.shownLevel ? `${name} +${look.shownLevel}` : name;
  }
  return lvl ? `${base} +${lvl}` : base;
}
