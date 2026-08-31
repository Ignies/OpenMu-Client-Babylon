import type { Item } from '../ecs/world';
import { InventoryConstants } from './inventoryConstants';

/**
 * The Q/W/E/R consumable slots of the bottom bar (`CNewUIItemHotKey`,
 * NewUIMainFrameWindow.cpp:929-1320).
 *
 * A slot does not hold an item; it holds a *kind* of item (type + level).
 * Every frame the bar looks the kind up in the inventory - best potion first
 * (large → small → apple) - and renders whatever it found with the summed
 * count. Using the key consumes that found item. Unbound slots fall back to
 * HP / MP / antidote / SD for Q / W / E / R.
 */

export const HOTKEY_COUNT = 4;
export const HOTKEY_Q = 0;
export const HOTKEY_W = 1;
export const HOTKEY_E = 2;
export const HOTKEY_R = 3;

export const POTION_GROUP = 14;

const APPLE = 0;
const LARGE_HEALING = 3;
const SMALL_MANA = 4;
const LARGE_MANA = 6;
const SIEGE = 7;
const ANTIDOTE = 8;
const ALE = 9;
const TOWN_PORTAL = 10;
const FRUIT = 20;
const SMALL_SHIELD = 35;
const LARGE_SHIELD = 37;
const SMALL_COMPLEX = 38;
const LARGE_COMPLEX = 40;

export type ItemHotkey = { type: number; level: number };

export const UNBOUND_HOTKEY: ItemHotkey = { type: -1, level: 0 };

const SINGLE_TYPES = new Set([
  SIEGE,
  ANTIDOTE,
  ALE,
  TOWN_PORTAL,
  FRUIT,
  46, 47, 48, 49, 50, // Jack O'Lantern
  70, 71, 78, 79, 80, 81, 82, 94,
  85, 86, 87, // Cherry blossom
  133,
]);

const isHealing = (n: number) => n >= APPLE && n <= LARGE_HEALING;
const isMana = (n: number) => n >= SMALL_MANA && n <= LARGE_MANA;
const isShield = (n: number) => n >= SMALL_SHIELD && n <= LARGE_SHIELD;
const isComplex = (n: number) => n >= SMALL_COMPLEX && n <= LARGE_COMPLEX;

/** `CNewUIMyInventory::CanRegisterItemHotKey`. */
export function canRegisterItemHotkey(item: Item | null | undefined): boolean {
  if (!item || item.group !== POTION_GROUP) return false;
  const n = item.num;
  return (
    isHealing(n) || isMana(n) || isShield(n) || isComplex(n) || SINGLE_TYPES.has(n)
  );
}

/**
 * The range [start..end] (descending, best first) a slot searches the
 * inventory for: `GetHotKeyCommonItem` + the per-key defaults of
 * `GetHotKeyItemIndex`.
 */
function searchRange(slot: number, hotkey: ItemHotkey): [number, number] {
  const t = hotkey.type;

  if (SINGLE_TYPES.has(t) && (t !== FRUIT || hotkey.level === 0)) return [t, t];
  if (isShield(t)) return [LARGE_SHIELD, SMALL_SHIELD];
  if (isComplex(t)) return [LARGE_COMPLEX, SMALL_COMPLEX];
  if (isHealing(t)) return [LARGE_HEALING, APPLE];
  if (isMana(t)) return [LARGE_MANA, SMALL_MANA];

  switch (slot) {
    case HOTKEY_Q:
      return [LARGE_HEALING, APPLE];
    case HOTKEY_W:
      return [LARGE_MANA, SMALL_MANA];
    case HOTKEY_E:
      return [ANTIDOTE, ANTIDOTE];
    default:
      return [LARGE_SHIELD, SMALL_SHIELD];
  }
}

const GRID_START = InventoryConstants.LastEquippableItemSlotIndex + 1;
const GRID_END = InventoryConstants.FirstExtensionItemSlotIndex;

/** Items with a level of their own, where the level must match to count. */
const levelMatters = (n: number) => n === SIEGE || n === TOWN_PORTAL || n === FRUIT;

/**
 * `GetHotKeyItemIndex(iType)`: the inventory slot the key would consume, or
 * -1. Best potion kind first; within a kind the last grid slot, as
 * `FindItemReverseIndex` does.
 */
export function findHotkeyItem(
  items: (Item | null)[],
  slot: number,
  hotkey: ItemHotkey
): number {
  const [start, end] = searchRange(slot, hotkey);

  for (let n = start; n >= end; n--) {
    for (let i = GRID_END - 1; i >= GRID_START; i--) {
      const item = items[i];
      if (!item || item.group !== POTION_GROUP || item.num !== n) continue;
      if (levelMatters(n) && (item.lvl ?? 0) !== hotkey.level) continue;
      return i;
    }
  }

  return -1;
}

/** `GetHotKeyItemIndex(iType, true)`: the number shown under the icon. */
export function countHotkeyItems(
  items: (Item | null)[],
  slot: number,
  hotkey: ItemHotkey
): number {
  const [start, end] = searchRange(slot, hotkey);
  let count = 0;

  for (let n = start; n >= end; n--) {
    for (let i = GRID_START; i < GRID_END; i++) {
      const item = items[i];
      if (!item || item.group !== POTION_GROUP || item.num !== n) continue;
      if (!isHealing(n) && levelMatters(n) && (item.lvl ?? 0) !== hotkey.level) {
        continue;
      }
      // Ale, scrolls and fruit are one per square; potions stack.
      if (n === ALE || n === TOWN_PORTAL || n === FRUIT) count++;
      else count += item.durability ?? 1;
    }
  }

  return count;
}
