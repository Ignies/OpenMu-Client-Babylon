import type { Entity } from '../ecs/world';

export type DropTier = 'normal' | 'high' | 'excellent' | 'money';

/** Level from which a drop counts as "high" (gold name, ground glow). */
export const HIGH_DROP_LEVEL = 7;

/** Visual tier of a dropped item: name colour + ground glow. */
export function dropTier(drop: NonNullable<Entity['droppedItem']>): DropTier {
  if (drop.isMoney) return 'money';
  const item = drop.item;
  if (!item) return 'normal';
  if (item.isExcellent) return 'excellent';
  if ((item.lvl ?? 0) >= HIGH_DROP_LEVEL) return 'high';
  return 'normal';
}

/** Name colours as the original tints them: excellent green, +7 and up gold, zen yellow. */
export const DROP_TIER_COLOURS: Record<DropTier, string> = {
  normal: '#ffffff',
  high: '#ffd700',
  excellent: '#80ff80',
  money: '#ffe28a',
};
