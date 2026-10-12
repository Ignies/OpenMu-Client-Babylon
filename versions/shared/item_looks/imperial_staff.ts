import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_IMPERIAL_STAFF (ZzzObject.cpp:7143-7152): the body lit, mesh 1 again additive, then mesh 0 as
// the blend mesh with the socket bitmap at |sin| + 0.1, drawn three times (one pass at three times that).
export default defineItemLook({
  items: [[5, 31]],
  body: {
    passes: [
      { mesh: 1, kind: 'add' },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Item/soketmagic_stape02.OZJ',
        clamp: true,
        gain: ms => (Math.abs(Math.sin(ms * 0.001)) + 0.1) * 3,
      },
    ],
  },
});
