import { defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';

// MODEL_BONE_BLADE (ZzzObject.cpp:7576-7599): mesh 0 as the StreamMesh (unlit), then again additive
// in amber with Chrome07 on its own UVs, swept along u (it scrolls as the StreamMesh).
export default defineItemLook({
  items: [[0, 22]],
  body: {
    passes: [
      { mesh: 0, kind: 'unlit' },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Effect/Chrome07.OZJ',
        clamp: true,
        light: fixedLight(1, 0.7, 0.4),
        u: ms => (Math.floor(ms) % 4000) * 0.0004 - 0.7,
      },
    ],
  },
});
