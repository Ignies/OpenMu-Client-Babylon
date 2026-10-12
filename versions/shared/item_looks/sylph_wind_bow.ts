import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_SYLPH_WIND_BOW (ZzzObject.cpp:7576-7599): mesh 0 as the StreamMesh (unlit), then again additive
// with Chrome06 on its own UVs, swept on both axes.
export default defineItemLook({
  items: [[4, 21]],
  body: {
    passes: [
      { mesh: 0, kind: 'unlit' },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Effect/Chrome06.OZJ',
        clamp: true,
        u: ms => (Math.floor(ms) % 4000) * 0.0002 - 0.3,
        v: ms => (Math.floor(ms) % 4000) * 0.0002 - 0.3,
      },
    ],
  },
});
