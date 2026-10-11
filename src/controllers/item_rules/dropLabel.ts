import type { Entity, Item } from '../../ecs/world';
import { ancientSetOf } from './ancientSets';
import { isSocketItem } from './itemOptions';
import { ItemGroup, isDivineArchangelWeapon, isWeaponOfArchangel, itemDef } from './itemStats';

/**
 * A ground name as `BuildGroundItemLabelDescriptor` draws it (ZzzInventory.cpp:6280-6663): its
 * colour, the bold face of the jewels and set items, and whether it sits on the set item's blue.
 */
export type DropLabel = { colour: string; bold: boolean; setItem: boolean };

/** The descriptor's colours, as `static_cast<BYTE>(f * 255.f)` makes them. */
const WHITE = '#ffffff';
const YELLOW = '#ffcc19';
const GRAY = '#b2b2b2';
const ORANGE = '#e58721';
const VIOLET = '#b266ff';

const id = (group: number, num: number) => group * 512 + num;
const ids = (group: number, ...ranges: (number | readonly [number, number])[]) =>
  ranges.flatMap(r => (typeof r === 'number' ? [id(group, r)] : Array.from({ length: r[1] - r[0] + 1 }, (_, i) => id(group, r[0] + i))));

/** `boldTextItems` (ZzzInventory.cpp:6009-6026), with the packed jewels (`Check_Jewel_Com`, :6329). */
const BOLD = new Set([
  ...ids(ItemGroup.Potion, 13, 14, 16, 22, 31, [41, 44], [17, 19]),
  ...ids(ItemGroup.Wing, 15, 30, 31, [136, 143]),
  id(ItemGroup.Helper, 14),
]);
const PACKED_JEWELS = new Set(ids(ItemGroup.Wing, 30, 31, [136, 143]));

/** `whiteTextItems`, `yellowTextItems`, `orangeTextItems` (ZzzInventory.cpp:6028-6200). */
const SET_COLOUR = new Map<number, string>([
  ...ids(ItemGroup.Wing, 48, 35).map(k => [k, WHITE] as const),
  ...[
    ...ids(ItemGroup.Potion, 13, 14, 16, 22, 31, [41, 44], [17, 19], 11, 64, [100, 109], [111, 124], [126, 132], [134, 139], 28, 29),
    ...ids(ItemGroup.Wing, 15, 30, 31, 25),
    ...ids(ItemGroup.Helper, 14, 15, 31, [49, 51], 91, [97, 99], [109, 115], 121),
  ].map(k => [k, YELLOW] as const),
  ...[
    ...ids(ItemGroup.Potion, [84, 87], 90, [45, 50], 53, 54, [58, 62], [70, 83], 88, 89, [91, 98], [141, 150]),
    ...ids(ItemGroup.Helper, 64, 65, 67, 80, 106, 123, 68, 76, 122, [43, 48], [54, 63], 116, [125, 134]),
    ...ids(ItemGroup.Wing, [130, 135]),
  ].map(k => [k, ORANGE] as const),
]);

/** The red, green and blue boxes (ribbon boxes 12/32-34, chocolate boxes 14/32-34 at +0 / +1). */
const BOX_COLOURS = ['#ff4c4c', '#4cff4c', '#4c4cff'];
const CHOCOLATE_COLOURS = ['#ff4cff', '#ff4c4c', '#4c4cff'];

/**
 * The colour of the descriptor's named branches (ZzzInventory.cpp:6320-6590), the item sets
 * included; undefined lets the level and option rules decide. A level that shows another model
 * (`CreateItemDrop`, ZzzObject.cpp:6014-6137) takes that model's branch.
 */
function namedColour(group: number, num: number, lvl: number): string | undefined {
  const key = id(group, num);
  if (group === ItemGroup.Potion) {
    // Box of Luck: +1 Star, +3 Heart, +5/+6 medals and +8..+12 Box of Kundun are white models.
    if (num === 11) return [1, 3, 5, 6, 8, 9, 10, 11, 12].includes(lvl) ? WHITE : YELLOW;
    if (num >= 32 && num <= 34) return lvl <= 1 ? CHOCOLATE_COLOURS[num - 32] : WHITE;
    if (num === 21 && lvl >= 1 && lvl <= 3) return YELLOW;
    if ((num === 23 || num === 24) && lvl === 1) return YELLOW;
    if (num === 9 && lvl === 1) return WHITE;
    if (num === 7 || num === 12) return WHITE;
  } else if (group === ItemGroup.Helper) {
    if (num === 20 && lvl <= 3) return YELLOW;
    if (num === 7 || num === 10 || num === 11) return WHITE;
    if (num === 66) return '#9966ff';
    if (num >= 83 && num <= 93) return ORANGE;
  } else if (group === ItemGroup.Wing) {
    if (num === 11) return GRAY;
    if (num >= 32 && num <= 34) return BOX_COLOURS[num - 32];
    if ((num >= 60 && num <= 65) || (num >= 70 && num <= 74) || (num >= 100 && num <= 129)) return VIOLET;
  }
  return SET_COLOUR.get(key);
}

/** The level and option rules of the descriptor's last branch (ZzzInventory.cpp:6590-6630). */
function tierColour(item: Item, lvl: number): string {
  const def = itemDef(item.group, item.num);
  // The Weapon of Archangel +0..+2 lies as its Divine weapon (ZzzObject.cpp:6067-6084).
  if (def && (isDivineArchangelWeapon(def) || (isWeaponOfArchangel(def) && lvl <= 2))) return '#ff19ff';
  if (isSocketItem(item.group, item.num)) return VIOLET;
  if ((item.excellentFlags ?? 0) & 0x3f) return '#19ff7f';
  if (lvl >= 7) return YELLOW;
  if (item.hasSkill || item.luck || (item.optionLevel ?? 0) > 0) return '#66b2ff';
  if (lvl === 0) return GRAY;
  if (lvl < 3) return '#e5e5e5';
  if (lvl < 5) return '#ff7f33';
  return '#66b2ff';
}

/** The ground name's look for one drop. */
export function dropLabel(drop: NonNullable<Entity['droppedItem']>): DropLabel {
  const item = drop.item;
  if (drop.isMoney || !item) return { colour: drop.isMoney ? YELLOW : WHITE, bold: false, setItem: false };
  const lvl = item.lvl ?? 0;
  const key = id(item.group, item.num);
  // Loch's Feather +1 is the Crest of Monarch model, yellow but not bold.
  const bold = BOLD.has(key) && !(key === id(ItemGroup.Helper, 14) && lvl === 1);
  if (PACKED_JEWELS.has(key)) return { colour: YELLOW, bold: true, setItem: false };
  const named = namedColour(item.group, item.num, lvl);
  if (named) return { colour: named, bold, setItem: false };
  if (ancientSetOf(item)) return { colour: '#00ff00', bold: true, setItem: true };
  return { colour: tierColour(item, lvl), bold, setItem: false };
}
