import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_FROST_MACE (ZzzObject.cpp:7128-7134): the body lit but mesh 1, then 1 and 2 additive (its
// mesh 3 call finds no mesh: the model has three).
export default defineItemLook({
  items: [[2, 16]],
  body: { passes: [{ mesh: 1, kind: 'bright' }, { mesh: 2, kind: 'add' }] },
});
