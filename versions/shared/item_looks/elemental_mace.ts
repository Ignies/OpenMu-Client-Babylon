import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_ELEMENTAL_MACE (ZzzObject.cpp:7055-7065): the body lit (mesh 2 hidden, ItemObjectAttribute),
// then mesh 2 as the blend mesh in a grey off the body's red, pulsing (below 0 it draws nothing), scrolling.
export default defineItemLook({
  items: [[2, 7]],
  body: {
    passes: [
      {
        mesh: 2,
        kind: 'bright',
        light: (ms, body, out) => {
          const l = Math.max(0, body.x * (Math.sin(ms * 0.001) * 0.5 + 0.3));
          out.set(l, l, l);
        },
        u: ms => ms * 0.001,
        v: ms => -ms * 0.0005,
      },
    ],
  },
});
