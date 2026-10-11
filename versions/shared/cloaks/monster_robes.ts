import { PCT_CURVED, PCT_CYLINDER, PCT_MASK_ALPHA, type ClothSpec } from '@/controllers/cloth';

/** `MONSTER_DEATH_KING` and `MONSTER_NIGHTMARE`, the two monsters `bCloak` names (ZzzCharacter.cpp:9173-9176). */
export const DEATH_KING = 55;
export const NIGHTMARE = 361;

/** `MONSTER_TERRIBLE_BUTCHER` to `MONSTER_DOPPELGANGER_SUM`, which wear none whatever their class (:9177-9180). */
export const isDoppelganger = (monster: number | null): boolean => monster !== null && monster >= 529 && monster <= 539;

/** The Death King's robe: `Player\Robe03.tga` (BITMAP_ROBE + 2) on the neck, keyed, over the back and the head (:9826-9832). */
export const DEATH_KING_ROBE: ClothSpec = {
  bone: 19,
  at: [0, 10, 0],
  grid: [10, 10],
  size: [55, 140],
  front: 'Player/Robe03.OZT',
  back: 'Player/Robe03.OZT',
  flags: PCT_CURVED | PCT_MASK_ALPHA,
  spheres: [
    [-10, -10, -10, 35, 17],
    [10, -10, -10, 35, 17],
    [0, -10, -40, 50, 19],
  ],
};

/** The Nightmare's: a cylinder of `Monster\nightmare_cloth.tga` (BITMAP_NIGHTMARE_ROBE) round its bone 2 (:9833-9836). */
export const NIGHTMARE_ROBE: ClothSpec = {
  bone: 2,
  at: [0, 0, 0],
  grid: [6, 6],
  size: [180, 100],
  front: 'Monster/nightmare_cloth.OZT',
  back: 'Monster/nightmare_cloth.OZT',
  flags: PCT_CYLINDER | PCT_MASK_ALPHA,
};
