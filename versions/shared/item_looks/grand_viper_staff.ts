import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_GRAND_VIPER_STAFF (ZzzObject.cpp:7576-7599): mesh 0 as the StreamMesh (unlit), then again
// additive with energy01 (BITMAP_CHROME_ENERGY) on its own UVs, swept on both axes.
export default defineItemLook({
  items: [[5, 12]],
  body: {
    passes: [
      { mesh: 0, kind: 'unlit' },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Effect/energy01.OZJ',
        clamp: true,
        u: ms => (Math.floor(ms) % 2000) * 0.0002 - 0.3,
        v: ms => (Math.floor(ms) % 2000) * 0.0002 - 0.3,
      },
    ],
  },
});
