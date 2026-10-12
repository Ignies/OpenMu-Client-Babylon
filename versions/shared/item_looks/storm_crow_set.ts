import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_STORM_CROW_ARMOR, _GLOVES, _PANTS, _BOOTS (ZzzObject.cpp:6900-6904): the body lit, then again with
// bab2 (BITMAP_CHROME + 1) by the chrome look-up, additive.
export default defineItemLook({
  items: [
    [8, 15],
    [9, 15],
    [10, 15],
    [11, 15],
  ],
  body: { passes: [{ mesh: -1, kind: 'add', texture: 'Effect/bab2.OZJ', map: 'chrome' }] },
});
