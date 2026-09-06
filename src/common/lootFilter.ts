import { GameOptions } from './gameOptions';
import { isJewel, itemDef } from './itemStats';
import { HIGH_DROP_LEVEL } from './dropTier';
import type { Entity } from '../ecs/world';

/**
 * Which drops keep their name on screen while the ALT overlay is latched.
 *
 * The overlay itself is the original's (`CNewUINameWindow`): ALT toggles the
 * names over every drop. On a busy hunting ground that is a wall of white
 * text, so the latched overlay runs the pile through these rules instead;
 * ALT *held* still shows everything, which is the escape hatch when the
 * filter hides something the player wanted.
 *
 * The vocabulary is MU Helper's pickup filter (`muHelper/config.ts`) on
 * purpose: what the helper would pick up is what the eye wants marked.
 */

type Drop = NonNullable<Entity['droppedItem']>;

/** Zen slider step -> the smallest pile that still gets a name. */
export const LOOT_ZEN_STEPS = [
  0, 100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000,
] as const;

export const LOOT_ZEN_MAX = LOOT_ZEN_STEPS.length - 1;

export function lootZenThreshold(step: number): number {
  return LOOT_ZEN_STEPS[Math.max(0, Math.min(LOOT_ZEN_MAX, step))] ?? 0;
}

/**
 * Whether the latched overlay names this drop. Reads `GameOptions`, so an
 * `observer` that calls it repaints when a filter box is ticked.
 */
export function dropPassesLootFilter(drop: Drop): boolean {
  if (!GameOptions.lootFilter) return true;

  if (drop.isMoney) {
    const amount = drop.amount ?? 0;
    return amount >= lootZenThreshold(GameOptions.lootZen);
  }

  const item = drop.item;
  if (item) {
    if (GameOptions.lootExcellent && item.isExcellent) return true;
    if (GameOptions.lootAncient && item.isAncient) return true;
    if (GameOptions.lootHighLevel && (item.lvl ?? 0) >= HIGH_DROP_LEVEL) return true;
  }

  if (GameOptions.lootJewels) {
    const def = itemDef(drop.group, drop.num);
    if (def && isJewel(def)) return true;
  }

  return GameOptions.lootOther;
}
