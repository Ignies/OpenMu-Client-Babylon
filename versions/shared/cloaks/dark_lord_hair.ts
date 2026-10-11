import { PCT_CURVED, PCT_MASK_BLEND, PCT_MASK_LIGHT, PCT_RUBBER2, PCT_SHORT_SHOULDER, type ClothSpec } from '@/controllers/cloth';

/** The hair's spheres, the upper back (ZzzCharacter.cpp:9709-9710). */
const BACK = [
  [-10, 20, 20, 27, 17],
  [10, 20, 20, 27, 17],
] as const;

/**
 * The Dark Lord's hair, cloths 0 and 1 on the head bone: `Monster\iui06.jpg` (BITMAP_ROBE + 6), rubber2 strands
 * in their own gusts (:9707-9715). The first is a `PCT_MASK_LIGHT` cloth (its faces pulse, a light on each
 * vertex), the second is added. The `PLS_STRICTDISTANCE` the original ORs in is `PCT_SHORT_SHOULDER`'s bit;
 * `PCT_OPT_HAIR` moves nothing.
 */
export const DARK_LORD_HAIR: readonly [ClothSpec, ClothSpec] = [
  {
    bone: 20,
    at: [0, 0, 20],
    grid: [6, 5],
    size: [30, 70],
    front: 'Monster/iui06.OZJ',
    back: 'Monster/iui06.OZJ',
    flags: PCT_CURVED | PCT_RUBBER2 | PCT_MASK_LIGHT | PCT_SHORT_SHOULDER,
    wind: [10, 50],
    spheres: BACK,
  },
  {
    bone: 20,
    at: [0, 5, 18],
    grid: [5, 5],
    size: [30, 70],
    front: 'Monster/iui06.OZJ',
    back: 'Monster/iui06.OZJ',
    flags: PCT_CURVED | PCT_RUBBER2 | PCT_MASK_BLEND | PCT_SHORT_SHOULDER,
    wind: [8, 40],
    spheres: BACK,
  },
];
