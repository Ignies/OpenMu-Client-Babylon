import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_HURRICANE_ARMOR, _GLOVES, _PANTS, _BOOTS (ZzzObject.cpp:7566-7575): the body lit, then again
// with bab2 (BITMAP_CHROME + 1) by the chrome look-up, additive, in (0.3 r, 0.8 g, g) of the body's light.
export default defineItemLook({
  items: [
    [8, 23],
    [9, 23],
    [10, 23],
    [11, 23],
  ],
  body: {
    passes: [
      {
        mesh: -1,
        kind: 'add',
        texture: 'Effect/bab2.OZJ',
        map: 'chrome',
        light: (_ms, body, out) => {
          out.set(body.x * 0.3, body.y * 0.8, body.y);
        },
      },
    ],
  },
});
