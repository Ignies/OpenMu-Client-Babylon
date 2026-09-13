import type { Item } from '../ecs/world';
import { InventoryConstants } from './inventoryConstants';
import { itemDef } from './itemStats';

/**
 * Which worn slot an item belongs to. `ItemSlot` in `items.json` names one
 * slot per item; the two pairs the original lets an item fall through to are
 * the hands (a weapon may go to the off hand) and the fingers.
 *
 * The one table: the inventory's drop guard, its right-click auto-equip and
 * the compare tooltip all read this and nothing else.
 */
export function equipSlots(item: Item): number[] {
  const slot = itemDef(item.group, item.num)?.slot ?? -1;
  if (slot < 0) return [];

  if (slot === InventoryConstants.LeftHandSlot) {
    return [slot, InventoryConstants.RightHandSlot];
  }
  if (slot === InventoryConstants.Ring1Slot) {
    return [slot, InventoryConstants.Ring2Slot];
  }

  return [slot];
}

/** True when dropping `item` onto `slot` equips it. */
export function isEquipable(slot: number, item: Item): boolean {
  return equipSlots(item).includes(slot);
}

/** The free slot the item would land in, -1 when it has none. */
export function equipDestination(
  item: Item,
  worn: readonly (Item | null)[]
): number {
  for (const slot of equipSlots(item)) {
    if (!worn[slot]) return slot;
  }
  return -1;
}
