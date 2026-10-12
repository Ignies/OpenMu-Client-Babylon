import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_FROST_BARRIER (ZzzObject.cpp:7172-7179): mesh 0 lit, mesh 1 additive in place, then mesh 2 as the
// blend mesh at |sin(WorldTime * 0.001)|; it has no carried case.
export default defineItemLook({
  items: [[6, 19]],
  body: {
    drawn: [0],
    passes: [
      { mesh: 1, kind: 'bright' },
      { mesh: 2, kind: 'bright', gain: ms => Math.abs(Math.sin(ms * 0.001)) },
    ],
  },
});
