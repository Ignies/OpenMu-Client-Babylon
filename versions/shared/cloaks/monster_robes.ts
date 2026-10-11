import { PCT_CURVED, PCT_CYLINDER, PCT_HEAVY, PCT_MASK_ALPHA, PCT_RUBBER, PCT_SHORT_SHOULDER, PCT_STICKED, type ClothSpec } from '@/controllers/cloth';

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

/** `MONSTER_MEGA_CRUST`, `MONSTER_ALPHA_CRUST`, `MONSTER_OMEGA_WING`: the Crust bodies that wear one (ZzzCharacter.cpp:8818). */
const MEGA_CRUST = 71;
const CRUSTS: ReadonlySet<number> = new Set([MEGA_CRUST, 74, 301]);

/** The Mega Crust's: a rubber strip of `Monster\iui02.tga` (BITMAP_ROBE + 3) from the neck, keyed (:8822-8824). */
const MEGA_CRUST_ROBE: ClothSpec = {
  bone: 19,
  at: [0, 10, 0],
  grid: [5, 15],
  size: [30, 300],
  front: 'Monster/iui02.OZT',
  back: 'Monster/iui02.OZT',
  flags: PCT_RUBBER | PCT_MASK_ALPHA,
};

/** The Alpha Crust's and the Omega Wing's: the same in `Monster\iui03.tga` (BITMAP_ROBE + 5). */
const ALPHA_CRUST_ROBE: ClothSpec = { ...MEGA_CRUST_ROBE, front: 'Monster/iui03.OZT', back: 'Monster/iui03.OZT' };

/** A Crust's robe, else null. */
export const crustRobe = (monster: number | null): ClothSpec | null =>
  monster === null || !CRUSTS.has(monster) ? null : monster === MEGA_CRUST ? MEGA_CRUST_ROBE : ALPHA_CRUST_ROBE;

/** `MONSTER_FRED` (508), the one body `MODEL_FRED` is made for (GMEmpireGuardian1.cpp:92-95). */
export const FRED = 508;

/**
 * `MODEL_FRED`'s cloth in `Draw_RenderObject` (ZzzObject.cpp:540-561): `Monster\deasuler_cloth.tga` on its bone 10,
 * sticked, heavy and keyed, a sphere on bone 2.
 */
export const FRED_CLOTH: ClothSpec = {
  bone: 10,
  at: [0, -10, 0],
  grid: [5, 12],
  size: [150, 190],
  front: 'Monster/deasuler_cloth.OZT',
  back: 'Monster/deasuler_cloth.OZT',
  flags: PCT_MASK_ALPHA | PCT_HEAVY | PCT_STICKED | PCT_SHORT_SHOULDER,
  spheres: [[50, -140, -20, 30, 2]],
};
