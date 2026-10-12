import { defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';

// MODEL_EXPLOSION_BLADE (ZzzObject.cpp:7600-7613): the body lit, mesh 0 again as the blend mesh,
// then 2 and 1 additive (blend mesh -2) in a faint blue pulse and in blue.
export default defineItemLook({
  items: [[0, 23]],
  body: {
    passes: [
      { mesh: 0, kind: 'add' },
      {
        mesh: 2,
        kind: 'add',
        light: (ms, _body, out) => {
          const l = Math.sin(ms * 0.0015) * 0.03 + 0.3;
          out.set(l, l, l + 0.1);
        },
      },
      { mesh: 1, kind: 'add', light: fixedLight(0.4, 0.4, 0.8) },
    ],
  },
});
