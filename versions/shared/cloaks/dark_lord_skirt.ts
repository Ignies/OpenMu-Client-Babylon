import { PCT_CURVED, PCT_HEAVY, PCT_MASK_ALPHA, PCT_SHORT_SHOULDER, PCT_STICKED, type ClothSpec } from '@/controllers/cloth';

/**
 * The Dark Lord's skirt, cloth 3 on the waist bone, over the class's own body: `Player\kaa.tga`
 * (BITMAP_DARK_LOAD_SKIRT), `Player\dark3chima3.tga` on the Lord Emperor (ZzzCharacter.cpp:9752-9761).
 * Built with the set, sticked at (0, 10, -5).
 */
const built = (front: string): ClothSpec => ({
  bone: 18,
  at: [0, 10, -5],
  grid: [5, 5],
  size: [50, 90],
  front,
  back: front,
  flags: PCT_MASK_ALPHA | PCT_HEAVY | PCT_STICKED | PCT_SHORT_SHOULDER,
  spheres: [[0, -15, -20, 30, 2]],
});

export const DARK_LORD_SKIRT_BUILT = built('Player/kaa.OZT');
export const LORD_EMPEROR_SKIRT_BUILT = built('Player/dark3chima3.OZT');

/**
 * Made again when the armour comes off (:9866-9920), at (0, 8, -5) with `PCT_CURVED` added to `PCT_STICKED`,
 * which the shape switch then reads as neither. The original's re-`Create` of a built skirt ORs its flags in
 * and adds a second, equal sphere: the same cloth.
 */
const remade = (skirt: ClothSpec): ClothSpec => ({ ...skirt, at: [0, 8, -5], flags: skirt.flags | PCT_CURVED });

export const DARK_LORD_SKIRT = remade(DARK_LORD_SKIRT_BUILT);
export const LORD_EMPEROR_SKIRT = remade(LORD_EMPEROR_SKIRT_BUILT);
