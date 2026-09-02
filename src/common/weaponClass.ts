import type { Item } from '../ecs/world';
import { BaseClass } from './characterStats';
import { ItemsDatabase } from './itemsDatabase';
import { PlayerAction } from './objects/enum';

/**
 * Weapon-class rules transcribed from the original client
 * (`SetPlayerStop` ZzzCharacter.cpp:255-335, `SetPlayerWalk` :549-620,
 * `IsBackItem` :14937-14951). Item groups: 0 sword, 1 axe, 2 mace, 3 spear,
 * 4 bow/crossbow, 5 staff (+ summoner sticks 14-20, books 21+), 6 shield.
 */

export const GROUP_SWORD = 0;
export const GROUP_AXE = 1;
export const GROUP_MACE = 2;
export const GROUP_SPEAR = 3;
export const GROUP_BOW = 4;
export const GROUP_STAFF = 5;
export const GROUP_SHIELD = 6;

const BOLT_INDEX = 7;
const ARROWS_INDEX = 15;

// MODEL__SPEAR = MODEL_SPEAR + 1, MODEL_DRAGON_LANCE = MODEL_SPEAR + 2 (_enum.h:1557)
const SPEAR_POSE_INDICES = new Set([1, 2]);
// Dark Reign Blade 21, Explosion Blade 23, Sword Dancer 25, Rune Blade 31 (_enum.h:1515-1523)
const TWO_HAND_SWORD_TWO_INDICES = new Set([21, 23, 25, 31]);
const MISTERY_STICK = 14;
const ETERNAL_WING_STICK = 20;
const BOOK_OF_SAHAMUTT = 21;

export type Hands = { leftHand: Item | null; rightHand: Item | null };

export function isWeaponItem(item: Item | null): item is Item {
  return !!item && item.group <= GROUP_SHIELD;
}

export function isAmmo(item: Item | null): boolean {
  return (
    !!item &&
    item.group === GROUP_BOW &&
    (item.num === BOLT_INDEX || item.num === ARROWS_INDEX)
  );
}

export function isShield(item: Item | null): boolean {
  return !!item && item.group === GROUP_SHIELD;
}

/**
 * Summoner books (staff 21-29). `RenderLinkObject` returns before drawing
 * them (ZzzCharacter.cpp:6453-6456): a book is never rendered on the
 * character at all, in hand or on the back.
 */
export function isBook(item: Item | null): boolean {
  return (
    !!item &&
    item.group === GROUP_STAFF &&
    item.num >= BOOK_OF_SAHAMUTT &&
    item.num <= 29
  );
}

/** `IsBowModel` (CharacterManager.cpp:68): 0-6, Celestial 17, Viper…Stinger 20-23, Air Lyn 24. */
export function isBow(item: Item | null): boolean {
  if (!item || item.group !== GROUP_BOW) return false;
  const n = item.num;
  return n <= 6 || n === 17 || (n >= 20 && n <= 24);
}

/** `IsCrossbowModel` (CharacterManager.cpp:76): 8-14, Saint 16, Divine CB…Great Reign 18-19. */
export function isCrossbow(item: Item | null): boolean {
  if (!item || item.group !== GROUP_BOW) return false;
  const n = item.num;
  return (n >= 8 && n <= 14) || n === 16 || n === 18 || n === 19;
}

/**
 * `GetEquipedBowType` (CharacterManager.cpp:267): a bow only counts from
 * weapon slot 1 (appearance "rightHand"), a crossbow only from slot 0.
 */
export function equippedBowType(
  hands: Hands | undefined
): 'bow' | 'crossbow' | null {
  if (!hands) return null;
  if (isBow(hands.rightHand)) return 'bow';
  if (isCrossbow(hands.leftHand)) return 'crossbow';
  return null;
}

/**
 * `ItemAttribute[].TwoHand` is not in items.json; the inventory width is the
 * reliable proxy for swords/axes/maces (two-handers are 2 wide), spears are
 * always two-handed, and staffs switch at Legendary Staff (index 5) — the
 * summoner sticks/books are one-handed.
 */
export function isTwoHanded(item: Item): boolean {
  switch (item.group) {
    case GROUP_SWORD:
    case GROUP_AXE:
    case GROUP_MACE: {
      const def = ItemsDatabase.getItem(item.group, item.num);
      return (def?.X ?? 1) >= 2;
    }
    case GROUP_SPEAR:
      return true;
    case GROUP_STAFF:
      return item.num >= 5 && item.num < MISTERY_STICK;
    case GROUP_BOW:
      return !isAmmo(item);
    default:
      return false;
  }
}

/**
 * `IsBackItem` (ZzzCharacter.cpp:14937): with a bow or crossbow equipped
 * everything rides the back; otherwise anything sword…shield except the
 * summoner books — the sticks (staff 14-20) do go to the back.
 */
export function isBackItem(item: Item, hands?: Hands): boolean {
  if (equippedBowType(hands) !== null) return true;
  return item.group <= GROUP_SHIELD && !isBook(item);
}

function equippedBow(hands: Hands): Item | null {
  for (const h of [hands.leftHand, hands.rightHand]) {
    if (isBow(h) || isCrossbow(h)) return h;
  }
  return null;
}

/**
 * Everything `SetPlayerStop` / `SetPlayerWalk` read off the character before
 * they reach the weapon switch (ZzzCharacter.cpp:157-679).
 */
export type CharacterPose = {
  hands: Hands | undefined;
  baseClass: BaseClass;
  /**
   * `gCharacterManager.IsFemale(c->Class)` — elf or summoner. Kept separate
   * from `baseClass` because the walk branch tests it directly.
   */
  isFemale: boolean;
  /**
   * The "no weapon or safe zone" collapse:
   * `(Weapon[0] == -1 && Weapon[1] == -1) || (SafeZone && !InBloodCastle())`.
   */
  weaponsStowed: boolean;
  /** `gMapManager.InChaosCastle()`: summoners pose and walk male in there. */
  inChaosCastle: boolean;
};

/** `SetPlayerStop`'s unarmed branch (ZzzCharacter.cpp:271-280). */
function plainStop(pose: CharacterPose): PlayerAction {
  switch (pose.baseClass) {
    case BaseClass.Elf:
      return PlayerAction.PLAYER_STOP_FEMALE;
    case BaseClass.Summoner:
      return pose.inChaosCastle
        ? PlayerAction.PLAYER_STOP_MALE
        : PlayerAction.PLAYER_STOP_SUMMONER;
    case BaseClass.RageFighter:
      return PlayerAction.PLAYER_STOP_RAGEFIGHTER;
    default:
      return PlayerAction.PLAYER_STOP_MALE;
  }
}

/** `SetPlayerWalk`'s unarmed branch (ZzzCharacter.cpp:556-562). */
function plainWalk(pose: CharacterPose): PlayerAction {
  if (!pose.isFemale) return PlayerAction.PLAYER_WALK_MALE;
  if (pose.baseClass === BaseClass.Summoner && pose.inChaosCastle) {
    return PlayerAction.PLAYER_WALK_MALE;
  }
  return PlayerAction.PLAYER_WALK_FEMALE;
}

/** The two weapon slots, filtered to actual weapons. Slot 0 is the main hand. */
function weapons(pose: CharacterPose): [Item | null, Item | null] {
  const hands = pose.hands;
  return [
    hands && isWeaponItem(hands.leftHand) ? hands.leftHand : null,
    hands && isWeaponItem(hands.rightHand) ? hands.rightHand : null,
  ];
}

/** `SetPlayerStop` weapon branch. */
export function chooseIdleAction(pose: CharacterPose): PlayerAction {
  const [main, off] = weapons(pose);
  if (pose.weaponsStowed || (!main && !off)) return plainStop(pose);

  if (main) {
    switch (main.group) {
      case GROUP_SWORD:
      case GROUP_AXE:
      case GROUP_MACE:
        if (!isTwoHanded(main)) return PlayerAction.PLAYER_STOP_SWORD;
        return main.group === GROUP_SWORD && TWO_HAND_SWORD_TWO_INDICES.has(main.num)
          ? PlayerAction.PLAYER_STOP_TWO_HAND_SWORD_TWO
          : PlayerAction.PLAYER_STOP_TWO_HAND_SWORD;
      case GROUP_SPEAR:
        return SPEAR_POSE_INDICES.has(main.num)
          ? PlayerAction.PLAYER_STOP_SPEAR
          : PlayerAction.PLAYER_STOP_SCYTHE;
      case GROUP_STAFF:
        if (main.num >= MISTERY_STICK && main.num <= ETERNAL_WING_STICK) {
          return PlayerAction.PLAYER_STOP_WAND;
        }
        if (main.num >= BOOK_OF_SAHAMUTT) break;
        return isTwoHanded(main)
          ? PlayerAction.PLAYER_STOP_SCYTHE
          : PlayerAction.PLAYER_STOP_SWORD;
    }
  }

  const bow = equippedBow(pose.hands!);
  if (bow) {
    return isCrossbow(bow)
      ? PlayerAction.PLAYER_STOP_CROSSBOW
      : PlayerAction.PLAYER_STOP_BOW;
  }

  return plainStop(pose);
}

/** `SetPlayerWalk`'s `c->Run < 40` branch (ZzzCharacter.cpp:567-612). */
export function chooseWalkAction(pose: CharacterPose): PlayerAction {
  const [main, off] = weapons(pose);
  if (pose.weaponsStowed || (!main && !off)) return plainWalk(pose);

  if (main) {
    switch (main.group) {
      case GROUP_SWORD:
      case GROUP_AXE:
      case GROUP_MACE:
        if (!isTwoHanded(main)) return PlayerAction.PLAYER_WALK_SWORD;
        return main.group === GROUP_SWORD && TWO_HAND_SWORD_TWO_INDICES.has(main.num)
          ? PlayerAction.PLAYER_WALK_TWO_HAND_SWORD_TWO
          : PlayerAction.PLAYER_WALK_TWO_HAND_SWORD;
      case GROUP_STAFF:
        if (main.num >= MISTERY_STICK && main.num <= ETERNAL_WING_STICK) {
          return PlayerAction.PLAYER_WALK_WAND;
        }
        if (main.num >= BOOK_OF_SAHAMUTT) break;
        return isTwoHanded(main)
          ? PlayerAction.PLAYER_WALK_SCYTHE
          : PlayerAction.PLAYER_WALK_SWORD;
      case GROUP_SPEAR:
        return SPEAR_POSE_INDICES.has(main.num)
          ? PlayerAction.PLAYER_WALK_SPEAR
          : PlayerAction.PLAYER_WALK_SCYTHE;
    }
  }

  const bow = equippedBow(pose.hands!);
  if (bow) {
    return isCrossbow(bow)
      ? PlayerAction.PLAYER_WALK_CROSSBOW
      : PlayerAction.PLAYER_WALK_BOW;
  }

  return plainWalk(pose);
}

/**
 * `SetPlayerWalk`'s `c->Run >= 40` branch (ZzzCharacter.cpp:615-670).
 *
 * Three ways it differs from the walk branch, all deliberate in the original:
 * a second melee weapon selects the dual-wield run (a Rage Fighter runs
 * plain instead), a two-handed staff runs with the *spear* clip rather than
 * the scythe one, and the whole spear group runs with `PLAYER_RUN_SPEAR` —
 * there is no Dragon Lance special case up here.
 */
export function chooseRunAction(pose: CharacterPose): PlayerAction {
  const [main, off] = weapons(pose);
  if (pose.weaponsStowed || (!main && !off)) return PlayerAction.PLAYER_RUN;

  if (main) {
    switch (main.group) {
      case GROUP_SWORD:
      case GROUP_AXE:
      case GROUP_MACE:
        if (off && off.group <= GROUP_MACE) {
          return pose.baseClass === BaseClass.RageFighter
            ? PlayerAction.PLAYER_RUN
            : PlayerAction.PLAYER_RUN_TWO_SWORD;
        }
        if (!isTwoHanded(main)) return PlayerAction.PLAYER_RUN_SWORD;
        return main.group === GROUP_SWORD && TWO_HAND_SWORD_TWO_INDICES.has(main.num)
          ? PlayerAction.PLAYER_RUN_TWO_HAND_SWORD_TWO
          : PlayerAction.PLAYER_RUN_TWO_HAND_SWORD;
      case GROUP_STAFF:
        if (main.num >= MISTERY_STICK && main.num <= ETERNAL_WING_STICK) {
          return PlayerAction.PLAYER_RUN_WAND;
        }
        if (main.num >= BOOK_OF_SAHAMUTT) break;
        return isTwoHanded(main)
          ? PlayerAction.PLAYER_RUN_SPEAR
          : PlayerAction.PLAYER_RUN_SWORD;
      case GROUP_SPEAR:
        return PlayerAction.PLAYER_RUN_SPEAR;
    }
  }

  const bow = equippedBow(pose.hands!);
  if (bow) {
    return isCrossbow(bow)
      ? PlayerAction.PLAYER_RUN_CROSSBOW
      : PlayerAction.PLAYER_RUN_BOW;
  }

  return PlayerAction.PLAYER_RUN;
}

/** Social actions during which the original also stows weapons (`:14961`). */
export function isSocialAction(action: PlayerAction): boolean {
  return action >= PlayerAction.PLAYER_GREETING1 && action <= PlayerAction.PLAYER_SALUTE1;
}
