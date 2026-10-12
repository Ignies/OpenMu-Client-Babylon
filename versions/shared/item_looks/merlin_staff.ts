import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_STAFF + 32 (ZzzObject.cpp:7153-7160): the body lit, Chrome01 over mesh 0, mesh 2 again additive
// and mesh 3 twice (one pass at twice the light).
export default defineItemLook({
  items: [[5, 32]],
  body: {
    passes: [
      { mesh: 0, kind: 'add', ...CHROME01 },
      { mesh: 2, kind: 'add' },
      { mesh: 3, kind: 'add', gain: () => 2 },
    ],
  },
});
