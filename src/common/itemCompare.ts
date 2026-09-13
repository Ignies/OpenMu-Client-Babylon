import type { Item } from '../ecs/world';
import type { TextKey } from '../i18n';
import { equipSlots } from './equipSlots';
import { GameOptions } from './gameOptions';
import {
  classCanUse,
  isShield,
  isWeapon,
  itemDef,
  type HeroStats,
  type ItemDef,
} from './itemStats';

/**
 * Which worn item a hovered item is measured against, and when the second
 * tooltip is drawn at all.
 */

/** `compareTooltips` steps, as the Options slider prints them. */
export const COMPARE_TOOLTIP_LABEL_KEYS: readonly TextKey[] = [
  'common.off',
  'options.compare.shift',
  'options.compare.always',
];

export const COMPARE_TOOLTIP_MAX = COMPARE_TOOLTIP_LABEL_KEYS.length - 1;

export const CompareTooltips = {
  Off: 0,
  HoldShift: 1,
  Always: 2,
} as const;

export function compareTooltipsOn(shiftHeld: boolean): boolean {
  const mode = Math.round(GameOptions.compareTooltips);
  if (mode >= CompareTooltips.Always) return true;
  return mode === CompareTooltips.HoldShift && shiftHeld;
}

/**
 * Like for like: a weapon is only ever measured against a weapon and a shield
 * against a shield, so an empty weapon hand never puts a sword next to the
 * shield in the other one.
 */
function sameKind(a: ItemDef, b: ItemDef): boolean {
  if (isWeapon(a) || isWeapon(b)) return isWeapon(a) && isWeapon(b);
  if (isShield(a) || isShield(b)) return isShield(a) && isShield(b);
  return a.slot === b.slot;
}

/**
 * The worn item the hovered one would replace, or null: nothing worn of that
 * kind, the item is not gear, the hero's class can never wear it, or the
 * hovered item is the worn one itself. Rings and earrings take the first of
 * their pair, which is the slot the item would land in.
 */
export function comparedItem(
  item: Item,
  worn: readonly (Item | null)[],
  hero: HeroStats
): Item | null {
  const def = itemDef(item.group, item.num);
  if (!def || def.slot < 0) return null;
  if (!classCanUse(def, hero)) return null;

  for (const slot of equipSlots(item)) {
    const other = worn[slot];
    if (!other || other === item) continue;

    const otherDef = itemDef(other.group, other.num);
    if (otherDef && sameKind(def, otherDef)) return other;
  }

  return null;
}
