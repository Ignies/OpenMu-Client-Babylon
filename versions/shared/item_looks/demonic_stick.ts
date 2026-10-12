import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_DEMONIC_STICK (ZzzObject.cpp:7914-7918): the body lit, mesh 1 again as the blend mesh.
export default defineItemLook({
  items: [[5, 18]],
  body: { passes: [{ mesh: 1, kind: 'add' }] },
});
