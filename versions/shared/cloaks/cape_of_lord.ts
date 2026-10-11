import { PCT_CURVED, PCT_HEAVY, PCT_MASK_ALPHA, PCT_SHORT_SHOULDER, type ClothSpec } from '@/controllers/cloth';
import { CAPE_OF_EMPEROR, CAPE_OF_LORD, HELPER_GROUP, WING_GROUP } from '@/controllers/actors/wings';
import type { Item } from '@/ecs/world';

/** The cape's spheres: the upper back, bone 17 (ZzzCharacter.cpp:9737-9740). */
const BACK = [
  [-10, -10, -10, 25, 17],
  [10, -10, -10, 25, 17],
  [-10, -10, 20, 27, 17],
  [10, -10, 20, 27, 17],
] as const;

/** The Dark Lord's cloth 2, the cape: `Player\DarklordRobe.tga` (BITMAP_ROBE + 7), 180 x 180 (:9733-9741). */
export const CAPE_OF_LORD_CLOTH: ClothSpec = {
  bone: 19,
  at: [0, 8, 10],
  grid: [10, 10],
  size: [180, 180],
  front: 'Player/DarklordRobe.OZT',
  back: 'Player/DarklordRobe.OZT',
  flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_MASK_ALPHA,
  spheres: BACK,
};

/** Under the Mantle of Monarch: `Item\dl_redwings02.tga` (BITMAP_ROBE + 9), heavy (:9717-9724). */
export const MANTLE_OF_MONARCH_CLOTH: ClothSpec = {
  ...CAPE_OF_LORD_CLOTH,
  front: 'Item/dl_redwings02.OZT',
  back: 'Item/dl_redwings02.OZT',
  flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY | PCT_MASK_ALPHA,
};

/** The Mantle's two straps, cloths 4 and 5: `Item\dl_redwings03.tga` (BITMAP_ROBE + 10), 12 x 200 (:9763-9772). */
const strap = (x: number, y: number): ClothSpec => ({
  bone: 19,
  at: [x, y, 10],
  grid: [2, 5],
  size: [12, 200],
  front: 'Item/dl_redwings03.OZT',
  back: 'Item/dl_redwings03.OZT',
  flags: PCT_MASK_ALPHA,
  spheres: [
    [0, -15, -20, 30, 2],
    [0, 0, 0, 35, 17],
  ],
});
export const MANTLE_OF_MONARCH_STRAPS = [strap(30, 15), strap(-30, 20)] as const;

export const isCapeOfLord = (wing: Item | null): boolean => wing?.group === HELPER_GROUP && wing.num === CAPE_OF_LORD;
export const isMantleOfMonarch = (wing: Item | null): boolean => wing?.group === WING_GROUP && wing.num === CAPE_OF_EMPEROR;
