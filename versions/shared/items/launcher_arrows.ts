import { MODEL, RGBS } from '@/controllers/fx/recipes';

/** Bow and crossbow arrows by launcher item index (group 4). */
export const LAUNCHER_ARROWS = {
  2: { model: MODEL.arrowV, colour: RGBS.steel },
 // Elven Bow
  6: { model: MODEL.arrowNature, colour: RGBS.venom },
 // Chaos Nature Bow
  8: { model: MODEL.arrowSteel, colour: RGBS.steel },
 // Crossbow
  9: { model: MODEL.arrowSteel, colour: RGBS.steel },
 // Golden Crossbow
  10: { model: MODEL.arrowSaw, colour: RGBS.steel },
 // Arquebus
  11: { model: MODEL.arrowLaser, colour: RGBS.arc },
 // Light Crossbow
  12: { model: MODEL.arrowThunder, colour: RGBS.arc },
 // Serpent Crossbow
  13: { model: MODEL.arrowWing, colour: RGBS.energy },
 // Bluewing Crossbow
  14: { model: MODEL.arrowBomb, colour: RGBS.fire },
 // Aquagold Crossbow
  16: { model: MODEL.arrowDouble, colour: RGBS.holy },
 // Saint Crossbow
  18: { model: MODEL.arrowBestCrossbow, colour: RGBS.holy },
 // Divine Crossbow of Archangel
  19: { model: MODEL.arrowDrill, colour: RGBS.steel },
 // Great Reign Crossbow
  20: { model: MODEL.laceArrow, colour: RGBS.venom },
 // Arrow Viper Bow
  21: { model: MODEL.arrowSpark, colour: RGBS.spark },
 // Sylph Wind Bow
  22: { model: MODEL.arrowRing, colour: RGBS.wind },
 // Albatross Bow
  23: { model: MODEL.arrowDarkStinger, colour: RGBS.dark },
 // Dark Stinger Bow
  24: { model: MODEL.arrowGamble, colour: RGBS.gold },
};
