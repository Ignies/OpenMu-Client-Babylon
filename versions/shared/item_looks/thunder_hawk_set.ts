import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_THUNDER_HAWK_ARMOR, _GLOVES, _PANTS, _BOOTS (ZzzObject.cpp:6905-6913): the body lit, then again with
// bab2 (BITMAP_CHROME + 1) by the chrome look-up, additive, in (0.85 r, 0.85 g, 1.2 b) of the body's light.
export default defineItemLook({
  items: [
    [8, 20],
    [9, 20],
    [10, 20],
    [11, 20],
  ],
  body: {
    passes: [
      {
        mesh: -1,
        kind: 'add',
        texture: 'Effect/bab2.OZJ',
        map: 'chrome',
        light: (_ms, body, out) => {
          out.set(body.x * 0.85, body.y * 0.85, body.z * 1.2);
        },
      },
    ],
  },
});
