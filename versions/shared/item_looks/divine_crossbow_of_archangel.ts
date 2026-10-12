import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import { archangelMetal } from './divine_sword_of_archangel';

// MODEL_DIVINE_CB_OF_ARCHANGEL (ZzzObject.cpp:6991-6996): as the staff, mesh 0 metal and a Chrome01 sweep
// back down v, mesh 1 lit. Its carried case is commented out (ZzzCharacter.cpp:7521-7538).
export default defineItemLook({
  items: [[4, 18]],
  body: { drawn: [1], passes: archangelMetal(-0.0001) },
});
