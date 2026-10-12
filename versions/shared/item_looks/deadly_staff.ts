import { defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';

// MODEL_DEADLY_STAFF (ZzzObject.cpp:7135-7142): the body lit, mesh 1 again as the blend mesh in pink.
export default defineItemLook({
  items: [[5, 30]],
  body: { passes: [{ mesh: 1, kind: 'add', light: fixedLight(1, 0.5, 0.5) }] },
});
