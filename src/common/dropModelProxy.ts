/**
 * `CreateItem`'s per-level model swap (ZzzObject.cpp:6056-6116): a few wire
 * items are shown on the ground as another model, picked by the item's
 * level. The swap replaces `o->Type` outright in the original, so the pose
 * (`ItemAngle`) follows the shown model too - a Weapon of Archangel lies
 * like the staff, sword or crossbow it displays, not like a ring.
 */

import { ItemGroup } from './itemAngle';
import { ItemsDatabase } from './itemsDatabase';

export type DropModelProxy = {
  /** The (group, num) whose ItemAngle pose the drop takes. */
  group: number;
  num: number;
  modelFilePath: string;
};

const WEAPON_OF_ARCHANGEL = 19;
const WIZARDS_RING = 20;

/**
 * Level 0 staff / 1 sword / 2 crossbow (`ITEM_WEAPON_OF_ARCHANGEL`,
 * ZzzObject.cpp:6066-6083), as the (group, num) of the real weapon whose
 * model the original points at: `MODEL_DIVINE_STAFF_OF_ARCHANGEL` is
 * Staff + 10, `MODEL_DIVINE_SWORD_OF_ARCHANGEL` Sword + 19,
 * `MODEL_DIVINE_CB_OF_ARCHANGEL` Bow + 18.
 */
const ARCHANGEL_WEAPONS: Record<number, readonly [number, number]> = {
  0: [ItemGroup.Staff, 10],
  1: [ItemGroup.Sword, 19],
  2: [ItemGroup.Bow, 18],
};

export function dropModelProxy(
  group: number,
  num: number,
  lvl: number
): DropModelProxy | null {
  if (group !== ItemGroup.Helper) return null;

  if (num === WEAPON_OF_ARCHANGEL) {
    const [g, n] = ARCHANGEL_WEAPONS[lvl] ?? ARCHANGEL_WEAPONS[0];
    const item = ItemsDatabase.getItem(g, n);
    if (!item) return null;
    return { group: g, num: n, modelFilePath: item.szModelFolder + item.szModelName };
  }

  // Wizards Ring: level 0 keeps its own MagicRing row; 1-3 are the Ring of
  // Lord event rings, `MODEL_EVENT + 14` (ZzzObject.cpp:6103-6116), a model
  // that is no item row of its own. The ring pose stays.
  if (num === WIZARDS_RING && lvl >= 1 && lvl <= 3) {
    return { group, num, modelFilePath: 'Item/RingOfLordEvent00.glb' };
  }

  return null;
}
