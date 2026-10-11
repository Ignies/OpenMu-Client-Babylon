import type { Entity } from '../../ecs/world';
import { isDivineArchangelWeapon, isWeaponOfArchangel, itemDef } from './itemStats';

export type DropTier = 'normal' | 'high' | 'excellent' | 'money' | 'archangel';

/** Level from which a drop counts as "high" (ground glow, loot filter, drop sound). */
export const HIGH_DROP_LEVEL = 7;

/** Glow tier of a dropped item (the name's colour is `dropLabel`). */
export function dropTier(drop: NonNullable<Entity['droppedItem']>): DropTier {
  if (drop.isMoney) return 'money';
  const item = drop.item;
  if (!item) return 'normal';
  const def = itemDef(item.group, item.num);
  // The Weapon of Archangel lies there as the Divine weapon it stands for
  // (ZzzObject.cpp:5496-5512).
  if (def && (isDivineArchangelWeapon(def) || isWeaponOfArchangel(def))) return 'archangel';
  if (item.isExcellent) return 'excellent';
  if ((item.lvl ?? 0) >= HIGH_DROP_LEVEL) return 'high';
  return 'normal';
}
