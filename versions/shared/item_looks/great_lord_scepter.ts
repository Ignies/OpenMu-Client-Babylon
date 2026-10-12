import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_GREAT_LORD_SCEPTER (ZzzObject.cpp:7925-7930): the body lit, meshes 1 and 3 again as blend meshes.
export default defineItemLook({
  items: [[2, 12]],
  body: { passes: [{ mesh: 1, kind: 'add' }, { mesh: 3, kind: 'add' }] },
});
