import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import { archangelGlint, archangelMetal } from './divine_sword_of_archangel';

// MODEL_DIVINE_STAFF_OF_ARCHANGEL (ZzzObject.cpp:6985-6990): mesh 0 metal and a Chrome01 sweep back down v,
// mesh 1 lit (no blend mesh).
// Carried (ZzzCharacter.cpp:7060-7076): ten glints in a row 40 cm off bone 0.
export default defineItemLook({
  items: [[5, 10]],
  body: { drawn: [1], passes: archangelMetal(-0.0001) },
  held: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(i => archangelGlint(0, [i * 30 - 180, -40, 0])),
});
