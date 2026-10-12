import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_GREAT_SCEPTER (ZzzObject.cpp:7528-7539): mesh 2 hidden from the body, drawn as the blend mesh
// scrolling on both axes.
export default defineItemLook({
  items: [[2, 10]],
  body: { passes: [{ mesh: 2, kind: 'bright', u: ms => ms * 0.0005, v: ms => ms * 0.0005 }] },
});
