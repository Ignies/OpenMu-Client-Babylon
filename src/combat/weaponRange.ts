/**
 * Basic-attack reach per weapon and the archer's ammunition check
 * (`Action()` ZzzInterface.cpp:3283-3299, `CheckArrow()` :3148-3170):
 * 1.8 tiles bare-handed or with a sword / axe / mace / staff, 2.2 with a
 * spear, 6.0 with any bow or crossbow — and a bow needs arrows, a crossbow
 * bolts, in the other hand with durability left.
 *
 * Pure readers over the hero's equipment; no per-frame state. Read by
 * `attackSystem` (range + ammo gate) and `networkSystem`'s path truncation.
 */
import type { Item } from '../ecs/world';
import type { CombatLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** `float Range = 1.8f`: melee reach in tiles, the flat default. */
export const MELEE_RANGE = 1.8;

/** Spears (`ITEM_SPEAR` group): 2.2 tiles. */
const SPEAR_RANGE = 2.2;

/** Any bow or crossbow (`BOWTYPE_NONE` excluded): 6 tiles. */
const RANGED_RANGE = 6;

/** Item groups (Item.group): 3 spear, 4 bow / crossbow / ammunition. */
const SPEAR_GROUP = 3;
const BOW_GROUP = 4;

/** `ITEM_BOLT` = group 4 index 7, `ITEM_ARROWS` = group 4 index 15. */
const BOLTS_INDEX = 7;
const ARROWS_INDEX = 15;

/** Bows are indices 0..7 of group 4 (minus the bolts), crossbows 8+ (minus the arrows). */
const FIRST_CROSSBOW_INDEX = 8;

// ---- 2. state + readers ----------------------------------------------------

export type Hands = { leftHand: Item | null; rightHand: Item | null } | undefined;

function isAmmo(item: Item | null): boolean {
  return (
    !!item &&
    item.group === BOW_GROUP &&
    (item.num === BOLTS_INDEX || item.num === ARROWS_INDEX)
  );
}

function isRangedWeapon(item: Item | null): item is Item {
  return !!item && item.group === BOW_GROUP && !isAmmo(item);
}

/** `BOWTYPE_CROSSBOW` for the launcher, `BOWTYPE_BOW` otherwise. */
function isCrossbow(weapon: Item): boolean {
  return weapon.num >= FIRST_CROSSBOW_INDEX;
}

/** The equipped launcher, if any. */
export function equippedLauncher(hands: Hands): Item | null {
  if (!hands) return null;
  if (isRangedWeapon(hands.leftHand)) return hands.leftHand;
  if (isRangedWeapon(hands.rightHand)) return hands.rightHand;
  return null;
}

/** Reach of a basic attack with these hands, in tiles. */
export function attackRange(hands: Hands): number {
  if (equippedLauncher(hands)) return RANGED_RANGE;
  const spear =
    (hands?.leftHand?.group === SPEAR_GROUP && !isAmmo(hands.leftHand)) ||
    (hands?.rightHand?.group === SPEAR_GROUP && !isAmmo(hands.rightHand));
  return spear ? SPEAR_RANGE : MELEE_RANGE;
}

/**
 * `CheckArrow()`: true when no launcher is equipped, or when the matching
 * ammunition sits in the other hand with durability left. A bow wants
 * arrows, a crossbow bolts. Unknown durability (offline test gear) counts
 * as loaded.
 */
export function hasAmmo(hands: Hands): boolean {
  const launcher = equippedLauncher(hands);
  if (!launcher || !hands) return true;
  const other = launcher === hands.leftHand ? hands.rightHand : hands.leftHand;
  if (!isAmmo(other)) return false;
  const wanted = isCrossbow(launcher) ? BOLTS_INDEX : ARROWS_INDEX;
  if (other!.num !== wanted) return false;
  return other!.durability === undefined || other!.durability > 0;
}

// ---- 3. the layer ----------------------------------------------------------

/** Readers only: nothing to step, nothing to drop. */
export const weaponRangeLayer: CombatLayer = {
  name: 'weaponRange',
};
