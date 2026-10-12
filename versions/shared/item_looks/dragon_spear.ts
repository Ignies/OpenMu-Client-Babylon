import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_DRAGON_SPEAR (ZzzObject.cpp:7050-7054): the body lit (mesh 1 hidden, ItemObjectAttribute), then
// mesh 1 as the blend mesh, scrolling.
export default defineItemLook({
  items: [[3, 10]],
  body: { passes: [{ mesh: 1, kind: 'bright', u: ms => ms * 0.0001, v: ms => ms * 0.0005 }] },
});
