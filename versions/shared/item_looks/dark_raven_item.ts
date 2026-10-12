import { CHROME01, defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';

// MODEL_DARK_RAVEN_ITEM (ZzzObject.cpp:7072-7077): the item lit, then Chrome01 over mesh 0 in cyan.
export default defineItemLook({
  items: [[13, 5]],
  body: { passes: [{ mesh: 0, kind: 'add', ...CHROME01, light: fixedLight(0.3, 0.8, 1) }] },
});
