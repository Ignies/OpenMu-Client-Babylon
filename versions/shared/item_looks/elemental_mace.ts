import { defineItemLook, heldLuminosity } from '@/controllers/item_fx/itemLooks';

// MODEL_ELEMENTAL_MACE (ZzzObject.cpp:7055-7065): the body lit (mesh 2 hidden, ItemObjectAttribute),
// then mesh 2 as the blend mesh in a grey off the body's red, pulsing (below 0 it draws nothing), scrolling.
// Carried (ZzzCharacter.cpp:7566-7575): a big gold flare and a pulsing grey one (a negative scale draws
// it mirrored) on bone 1.
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
  held: [
    {
      texture: 'flare01',
      bone: 1,
      scale: 2,
      light: (ms, _body, out) => {
        const l = heldLuminosity(ms);
        out.set(l, l * 0.9, 0);
      },
    },
    { texture: 'flare01', bone: 1, scale: ms => Math.abs(Math.sin(ms * 0.002) + 0.5), light: [0.5, 0.5, 0.5] },
  ],
});
