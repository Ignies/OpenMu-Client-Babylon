import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_PLATINA_STAFF (ZzzObject.cpp:7657-7662): mesh 1 hidden from the body, drawn as the blend mesh
// scrolling on both axes.
export default defineItemLook({
  items: [[5, 13]],
  body: { passes: [{ mesh: 1, kind: 'bright', u: ms => ms * 0.0009, v: ms => ms * 0.0009 }] },
});
