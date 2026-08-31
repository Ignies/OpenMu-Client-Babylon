import type { Item } from '../ecs/world';
import { InventoryConstants } from './inventoryConstants';

/**
 * Item upgrading with jewels: pick a jewel, click it onto an item
 * (`CNewUIMyInventory::ApplyJewels`, NewUIMyInventory.cpp:1546). Pure rules
 * only - the packet (0x26 ConsumeItemRequest, ItemSlot = jewel, TargetSlot =
 * item) is sent by `Store.applyPickedJewel`, the answer
 * (`InventoryItemUpgraded` / `ItemConsumptionFailed`) lands in logic.ts.
 *
 * Server truth (OpenMU `ItemModifyConsumeHandlerPlugIn`): the target must sit
 * in the inventory grid, never in an equipment slot, and the jewel's own
 * handler decides the level / option window. The checks here mirror the
 * original client so an obviously wrong drop never leaves the client.
 */

/** Jewels share the potion group. */
export const JEWEL_GROUP = 14;

/** Item numbers inside group 14 that are dropped onto gear. */
export const JEWEL = {
  bless: 13,
  soul: 14,
  life: 16,
  creation: 22,
  guardian: 31,
  gemstone: 41,
  harmony: 42,
  lowerRefineStone: 43,
  higherRefineStone: 44,
} as const;

/** Jewel of Chaos lives in the jewel-of-chaos group (12, 15); it is only ever mixed. */
export const JEWEL_OF_CHAOS = { group: 12, num: 15 } as const;

/**
 * ApplyJewels' pick list: what may be clicked onto an item. Creation, Chaos,
 * Guardian and Gemstone go through the chaos machine, never onto an item.
 */
const ITEM_JEWELS: ReadonlySet<number> = new Set([
  JEWEL.bless,
  JEWEL.soul,
  JEWEL.life,
  JEWEL.harmony,
  JEWEL.lowerRefineStone,
  JEWEL.higherRefineStone,
]);

/** Jewels that stay a jewel even when the whole stack is gone (no gulp sound). */
export function isJewel(item: Item): boolean {
  return (
    (item.group === JEWEL_GROUP &&
      (ITEM_JEWELS.has(item.num) ||
        item.num === JEWEL.creation ||
        item.num === JEWEL.guardian ||
        item.num === JEWEL.gemstone)) ||
    (item.group === JEWEL_OF_CHAOS.group && item.num === JEWEL_OF_CHAOS.num)
  );
}

/** True when the carried item is a jewel that is applied by clicking it onto gear. */
export function isUpgradeJewel(item: Item): boolean {
  return item.group === JEWEL_GROUP && ITEM_JEWELS.has(item.num);
}

/** Highest item level a jewel still applies to (`iLevel >= 6` / `>= 9` refuse). */
const BLESS_MAX_TARGET_LEVEL = 5;
const SOUL_MAX_TARGET_LEVEL = 8;

/** Wing item numbers of group 12 that count as gear (ApplyJewels' wing ranges). */
const WING_NUMBERS: ReadonlySet<number> = new Set([
  0, 1, 2, 3, 4, 5, 6, // 1st / 2nd class wings + Wings of Darkness
  36, 37, 38, 39, 40, 41, 42, 43, // 3rd class wings + Cape of Emperor
  49, 50, // Cape of Fighter / Overrule
  130, 131, 132, 133, 134, 135, // small wings
]);

/** Ammunition never takes a jewel (`ITEM_BOLT` 4/7, `ITEM_ARROWS` 4/15). */
const AMMO_NUMBERS: ReadonlySet<number> = new Set([7, 15]);

/** Gear that accepts a jewel: weapons, armour, wings, Cape of Lord (13, 30). */
export function isJewelTarget(item: Item): boolean {
  if (item.group <= 11) return !(item.group === 4 && AMMO_NUMBERS.has(item.num));
  if (item.group === 12) return WING_NUMBERS.has(item.num);
  if (item.group === 13) return item.num === 30;
  return false;
}

/**
 * Why `jewel` may not be dropped on `target` sitting at `targetSlot`, or
 * `null` when the request may go out. Texts match the original's system log
 * tone (GlobalText[474] for the storage case lives in Store).
 */
export function jewelTargetError(jewel: Item, target: Item, targetSlot: number): string | null {
  if (!isUpgradeJewel(jewel)) return 'That item cannot be used on another item';

  if (targetSlot < InventoryConstants.EquippableSlotsCount) {
    return 'Take the item off before upgrading it';
  }

  if (!isJewelTarget(target)) return 'That item cannot be upgraded';

  const level = target.lvl ?? 0;

  switch (jewel.num) {
    case JEWEL.bless:
      if (level > BLESS_MAX_TARGET_LEVEL) return 'Jewel of Bless only works up to +6';
      return null;
    case JEWEL.soul:
      if (level > SOUL_MAX_TARGET_LEVEL) return 'Jewel of Soul only works up to +9';
      return null;
    case JEWEL.life:
      return null;
    case JEWEL.harmony:
      if (target.isAncient) return 'Jewel of Harmony cannot be applied to ancient items';
      if ((target.socketCount ?? 0) > 0) return 'Jewel of Harmony cannot be applied to socket items';
      return null;
    case JEWEL.lowerRefineStone:
    case JEWEL.higherRefineStone:
      if ((target.socketCount ?? 0) > 0) return 'Refining stones cannot be applied to socket items';
      return null;
    default:
      return 'That item cannot be used on another item';
  }
}
