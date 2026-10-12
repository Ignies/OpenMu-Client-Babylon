import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_SWORD_BREAKER (ZzzObject.cpp:7115-7119): the body lit, Chrome01 over mesh 1.
export default defineItemLook({
  items: [[0, 27]],
  body: { passes: [{ mesh: 1, kind: 'add', ...CHROME01 }] },
});
