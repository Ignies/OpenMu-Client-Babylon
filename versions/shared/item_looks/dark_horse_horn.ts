import { CHROME01, defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';

// MODEL_DARK_HORSE_ITEM (ZzzObject.cpp:7066-7071): the horn lit, then Chrome01 over it in orange. The
// mount itself is the pets controller's model; this is the item on the ground and in the bag.
export default defineItemLook({
  items: [[13, 4]],
  body: { passes: [{ mesh: -1, kind: 'add', ...CHROME01, light: fixedLight(0.8, 0.4, 0.1) }] },
});
