import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import { archangelGlint } from './divine_sword_of_archangel';

// MODEL_DIVINE_STAFF_OF_ARCHANGEL carried (ZzzCharacter.cpp:7060-7076): ten glints in a row 40 cm off bone 0.
export default defineItemLook({
  items: [[5, 10]],
  held: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(i => archangelGlint(0, [i * 30 - 180, -40, 0])),
});
