/**
 * `CreateItem`'s per-level model swap (ZzzObject.cpp:6013-6137): a few wire
 * items are shown on the ground as another model, picked by the item's
 * level. The swap replaces `o->Type` outright in the original, so the pose
 * (`ItemAngle`) follows the shown model too - a Weapon of Archangel lies
 * like the staff, sword or crossbow it displays, not like a ring.
 */

import type { ItemRestPose } from '../actors';
import { ItemGroup } from './itemStats';
import { ItemsDatabase } from '@versions/shared/items/itemsDatabase';

type DropModelProxy = {
  /** The (group, num) whose ItemAngle pose the drop takes. */
  group: number;
  num: number;
  modelFilePath: string;
  /** `ItemAngle`'s own branch for the shown model, when it is no item row. */
  pose?: ItemRestPose;
};

const WEAPON_OF_ARCHANGEL = 19;
const WIZARDS_RING = 20;
const SCROLL_OF_EMPEROR = 23;
const BROKEN_SWORD = 24;

/**
 * Level 1 Scroll of the Emperor / Broken Sword: Ring of Honor and Dark Stone,
 * `MODEL_EVENT + 12` / `+ 13` = `QuestItem3RD` 0 / 1 (ZzzObject.cpp:6088-6105),
 * posed by ItemAngle's branches for them (ZzzObject.cpp:5767-5780).
 */
const QUEST_LEVEL_ONE: Record<number, DropModelProxy> = {
  [SCROLL_OF_EMPEROR]: {
    group: ItemGroup.Potion,
    num: SCROLL_OF_EMPEROR,
    modelFilePath: 'Item/QuestItem3rd00.glb',
    pose: { angle: [160, -183, 198], scale: 0.38 },
  },
  [BROKEN_SWORD]: {
    group: ItemGroup.Potion,
    num: BROKEN_SWORD,
    modelFilePath: 'Item/QuestItem3rd01.glb',
    pose: { angle: [160, -183, 198], scale: 0.54 },
  },
};

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

/**
 * The same three, for the copy the Blood Castle carrier wears on the back
 * (`c->EtcPart`, ZzzCharacter.cpp:15380-15385). Out of range = the staff,
 * which is the original's own default.
 */
export function archangelWeapon(level: number): readonly [number, number] {
  return ARCHANGEL_WEAPONS[level] ?? ARCHANGEL_WEAPONS[0];
}

const ALE = 9;
const BOX_OF_LUCK = 11;
const RENA = 21;
const PINK_CHOCOLATE_BOX = 32;
const BLUE_CHOCOLATE_BOX = 34;

/** `ItemAngle`'s branches for the MagicBox event models (ZzzObject.cpp:5670-5686); the rest keep the default pose. */
const FLAT_BOX = { angle: [90, 0, -45], scale: 0.8 } as const;
const MEDAL = { angle: [270, 0, 45], scale: 0.8 } as const;

/**
 * Box of Luck by level (ZzzObject.cpp:6014-6047): the Star of Sacred Birth,
 * Firecracker, Heart of Love, the medals and Box of Kundun +1..+5, each its
 * own `MODEL_EVENT` MagicBox (ZzzOpenData.cpp:968-982).
 */
const BOX_OF_LUCK_LEVELS: Record<number, { file: number; pose: ItemRestPose }> = {
  1: { file: 2, pose: FLAT_BOX },
  2: { file: 3, pose: FLAT_BOX },
  3: { file: 5, pose: { angle: [0, 0, -45], scale: 0.8 } },
  5: { file: 6, pose: MEDAL },
  6: { file: 7, pose: MEDAL },
  8: { file: 8, pose: { angle: [0, 0, -45], scale: 0.2 } },
  13: { file: 5, pose: { angle: [0, 0, -45], scale: 0.8 } },
  14: { file: 3, pose: FLAT_BOX },
  15: { file: 3, pose: FLAT_BOX },
};
const KUNDUN_FIRST = 8;
const KUNDUN_LAST = 12;

/** Level 1 chocolate boxes are the candy boxes, `MODEL_EVENT + 21..23` (ZzzObject.cpp:6050-6057). */
const CANDY_BOXES = ['p03box', 'obox02', 'blue01'];

function potionProxy(num: number, lvl: number): DropModelProxy | null {
  if (num === BOX_OF_LUCK) {
    const row = BOX_OF_LUCK_LEVELS[lvl >= KUNDUN_FIRST && lvl <= KUNDUN_LAST ? KUNDUN_FIRST : lvl];
    if (!row) return null;
    return { group: ItemGroup.Potion, num, modelFilePath: `Item/MagicBox0${row.file}.glb`, pose: row.pose };
  }
  if (num >= PINK_CHOCOLATE_BOX && num <= BLUE_CHOCOLATE_BOX && lvl === 1) {
    return { group: ItemGroup.Potion, num, modelFilePath: `Item/${CANDY_BOXES[num - PINK_CHOCOLATE_BOX]}.glb` };
  }
  // Rena +1 / +2 is the Stone, `MODEL_EVENT + 11` (ZzzObject.cpp:6059-6066, pose :5734).
  if (num === RENA && (lvl === 1 || lvl === 2)) {
    return {
      group: ItemGroup.Potion,
      num,
      modelFilePath: 'Item/EventBloodCastle03.glb',
      pose: { angle: [115, 75, 8], scale: 0.4 },
    };
  }
  // Ale +1 is `MODEL_EVENT + 7`, Beer02 (ZzzObject.cpp:6121-6129, ZzzOpenData.cpp:970, pose :5786).
  if (num === ALE && lvl === 1) {
    return { group: ItemGroup.Potion, num, modelFilePath: 'Item/Beer02.glb', pose: { angle: [0, 0, 45], scale: 0.8 } };
  }
  return lvl === 1 ? (QUEST_LEVEL_ONE[num] ?? null) : null;
}

/** `Vector(0, 0, -45)` and `ItemObjectAttribute`'s 0.8: a model ItemAngle has no branch for. */
const DEFAULT_POSE = { angle: [0, 0, -45], scale: 0.8 } as const;

const LIFE_STONE = 11;
const LOCHS_FEATHER = 14;

/**
 * Level 1 Life Stone / Loch's Feather: `MODEL_EVENT + 18` LifeStoneItem and
 * `+ 16` DarkLordSleeve (ZzzObject.cpp:6130-6137, ZzzOpenData.cpp:735/1016),
 * posed by ItemAngle's `+ 16` branch (ZzzObject.cpp:5762); `+ 18` has none.
 */
const HELPER_LEVEL_ONE: Record<number, DropModelProxy> = {
  [LIFE_STONE]: {
    group: ItemGroup.Helper,
    num: LIFE_STONE,
    modelFilePath: 'Item/LifestoneItem.glb',
    pose: DEFAULT_POSE,
  },
  [LOCHS_FEATHER]: {
    group: ItemGroup.Helper,
    num: LOCHS_FEATHER,
    modelFilePath: 'Item/DarkLordSleeve.glb',
    pose: { angle: [0, 0, 45], scale: 0.5 },
  },
};

export function dropModelProxy(
  group: number,
  num: number,
  lvl: number
): DropModelProxy | null {
  if (group === ItemGroup.Potion) return potionProxy(num, lvl);
  if (group !== ItemGroup.Helper) return null;

  if (num === WEAPON_OF_ARCHANGEL) {
    const [g, n] = ARCHANGEL_WEAPONS[lvl] ?? ARCHANGEL_WEAPONS[0];
    const item = ItemsDatabase.getItem(g, n);
    if (!item) return null;
    return { group: g, num: n, modelFilePath: item.szModelFolder + item.szModelName };
  }

  // Wizards Ring: level 0 is `MODEL_EVENT + 15` (MagicRing00, the row's own
  // model), 1-3 the Ring of Lord event rings, `MODEL_EVENT + 14`
  // (ZzzObject.cpp:6107-6120). ItemAngle has no branch for either.
  if (num === WIZARDS_RING) {
    if (lvl === 0) return { group, num, modelFilePath: 'Item/MagicRing00.glb', pose: DEFAULT_POSE };
    if (lvl <= 3) return { group, num, modelFilePath: 'Item/RingOfLordEvent00.glb' };
    return null;
  }

  return lvl === 1 ? (HELPER_LEVEL_ONE[num] ?? null) : null;
}
