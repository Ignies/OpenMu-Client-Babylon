import { PCT_CURVED, PCT_HEAVY, PCT_MASK_ALPHA, PCT_SHORT_SHOULDER, PCT_STICKED, type ClothSpec } from '@/controllers/cloth';

/**
 * The Dark Lord's skirt, cloth 3 on the waist bone, over the class's own body: `Player\kaa.tga`
 * (BITMAP_DARK_LOAD_SKIRT), `Player\dark3chima3.tga` on the Lord Emperor (ZzzCharacter.cpp:9752-9761).
 * The set is built with 3 cloths, so the frame after it makes this one again at (0, 8, -5) and adds
 * `PCT_CURVED` to `PCT_STICKED` (:9866-9887): the shape switch then matches neither.
 */
const skirt = (front: string): ClothSpec => ({
  bone: 18,
  at: [0, 8, -5],
  grid: [5, 5],
  size: [50, 90],
  front,
  back: front,
  flags: PCT_MASK_ALPHA | PCT_HEAVY | PCT_STICKED | PCT_CURVED | PCT_SHORT_SHOULDER,
  spheres: [[0, -15, -20, 30, 2]],
});

export const DARK_LORD_SKIRT = skirt('Player/kaa.OZT');
export const LORD_EMPEROR_SKIRT = skirt('Player/dark3chima3.OZT');

/**
 * Under the Mantle of Monarch the set is built with 6 cloths and keeps the skirt it was built with, sticked at
 * (0, 10, -5); a Lord Emperor's is torn off the next frame, its body not being `SKIN_CLASS_DARK_LORD` (:9888-9896).
 */
export const MANTLE_SKIRT: ClothSpec = {
  ...DARK_LORD_SKIRT,
  at: [0, 10, -5],
  flags: PCT_MASK_ALPHA | PCT_HEAVY | PCT_STICKED | PCT_SHORT_SHOULDER,
};
