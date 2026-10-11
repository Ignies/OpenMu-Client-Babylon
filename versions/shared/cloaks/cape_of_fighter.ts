import {
  PCT_CURVED,
  PCT_ELASTIC_RAGE_L,
  PCT_ELASTIC_RAGE_R,
  PCT_HEAVY,
  PCT_MASK_ALPHA,
  PCT_SHORT_SHOULDER,
  type ClothSpec,
} from '@/controllers/cloth';
import { CAPE_OF_FIGHTER, CAPE_OF_OVERRULE, WING_GROUP } from '@/controllers/actors/wings';
import type { Item } from '@/ecs/world';

/** The Rage Fighter's cloth 0, the cape: `Item\NCcape.tga` (BITMAP_NCCAPE), 180 x 170 (ZzzCharacter.cpp:9799-9806). */
export const CAPE_OF_FIGHTER_CLOTH: ClothSpec = {
  bone: 19,
  at: [0, 15, 5],
  grid: [10, 10],
  size: [180, 170],
  front: 'Item/NCcape.OZT',
  back: 'Item/NCcape.OZT',
  flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY | PCT_MASK_ALPHA,
  spheres: [
    [-10, -10, -10, 35, 17],
    [10, -10, -10, 35, 17],
    [-10, -10, 20, 37, 17],
    [10, -10, 20, 37, 17],
  ],
};

/** Under the Cape of Overrule: `Item\monke_manto.TGA` (BITMAP_MANTOE), the same cape otherwise (:9783-9790). */
export const CAPE_OF_OVERRULE_CLOTH: ClothSpec = {
  ...CAPE_OF_FIGHTER_CLOTH,
  front: 'Item/monke_manto.OZT',
  back: 'Item/monke_manto.OZT',
};

/** The Overrule's straps, cloths 1 and 2: `Item\monk_manto01.TGA` (BITMAP_MANTO01), blown out left and right (:9808-9817). */
const strap = (x: number, flags: number, reach: number): ClothSpec => ({
  bone: 19,
  at: [x, 15, 2],
  grid: [2, 5],
  size: [12, 180],
  front: 'Item/monk_manto01.OZT',
  back: 'Item/monk_manto01.OZT',
  flags: flags | PCT_MASK_ALPHA,
  spheres: [
    [0, -15, -20, 35, 2],
    [0, 0, 0, reach, 17],
  ],
});
export const CAPE_OF_OVERRULE_STRAPS = [strap(25, PCT_ELASTIC_RAGE_L, 45), strap(-25, PCT_ELASTIC_RAGE_R, 50)] as const;

export const isCapeOfFighter = (wing: Item | null): boolean => wing?.group === WING_GROUP && wing.num === CAPE_OF_FIGHTER;
export const isCapeOfOverrule = (wing: Item | null): boolean => wing?.group === WING_GROUP && wing.num === CAPE_OF_OVERRULE;
