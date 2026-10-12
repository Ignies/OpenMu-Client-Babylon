import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_SHINING_SCEPTER carried (ZzzCharacter.cpp:7319-7343): a pulsing gold Shiny02 of random size and a
// big flare at the head (bone 1), smaller flares on bones 2 and 3.
export default defineItemLook({
  items: [[2, 15]],
  held: [
    {
      texture: 'shiny02',
      bone: 1,
      scale: () => Math.floor(Math.random() * 10) / 30 + 1.7,
      light: (ms, _body, out) => {
        const l = Math.sin(ms * 0.002) * 0.3 + 0.1;
        out.set(0.8 + l, 0.5 + l, 0.1 + l);
      },
    },
    { texture: 'flare01', bone: 1, scale: 3, light: [0.7, 0.5, 0.3] },
    { texture: 'flare01', bone: 2, scale: 1.5, light: [0.8, 0.6, 0.4] },
    { texture: 'flare01', bone: 3, scale: 1.2, light: [0.8, 0.6, 0.4] },
  ],
});
