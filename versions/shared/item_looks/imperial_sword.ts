import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_IMPERIAL_SWORD (ZzzObject.cpp:7120-7127): the body lit, mesh 2 again additive, then 1 as the
// blend mesh at a pulsing BlendMeshLight.
export default defineItemLook({
  items: [[0, 28]],
  body: {
    passes: [
      { mesh: 2, kind: 'add' },
      { mesh: 1, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.001) * 0.6 + 0.4) },
    ],
  },
});
