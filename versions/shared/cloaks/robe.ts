import { PCT_CURVED, PCT_HEAVY, PCT_MASK_ALPHA, PCT_SHORT_SHOULDER, type ClothSpec } from '@/controllers/cloth';
import { WING_GROUP, WING_OF_RUIN } from '@/controllers/actors/wings';
import type { Item } from '@/ecs/world';

/**
 * The robe, cloth 0 of everyone neither Dark Lord nor Rage Fighter: `Player\Robe01.jpg` in front and
 * `Robe02.jpg` behind (BITMAP_ROBE, + 1), 75 x 120, opaque (ZzzCharacter.cpp:9843-9846).
 */
export const ROBE_CLOTH: ClothSpec = {
  bone: 19,
  at: [0, 10, 0],
  grid: [10, 10],
  size: [75, 120],
  front: 'Player/Robe01.OZJ',
  back: 'Player/Robe02.OZJ',
  flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY,
};

/** Under the Wing of Ruin: `Item\msword03.tga` (BITMAP_ROBE + 8), 120 x 120, keyed (:9839-9842). */
export const WING_OF_RUIN_ROBE_CLOTH: ClothSpec = {
  bone: 19,
  at: [0, 15, 0],
  grid: [10, 10],
  size: [120, 120],
  front: 'Item/msword03.OZT',
  back: 'Item/msword03.OZT',
  flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY | PCT_MASK_ALPHA,
};

export const robeFor = (wing: Item | null): ClothSpec =>
  wing?.group === WING_GROUP && wing.num === WING_OF_RUIN ? WING_OF_RUIN_ROBE_CLOTH : ROBE_CLOTH;
