import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_STRYKER_SCEPTER carried (ZzzCharacter.cpp:8310-8344): a Shiny02 and light marks at rx01 (bone 5),
// a bigger Shiny02 at rx02 (6), gold ones at bones 2 and 3, a pulsing Flare at 4; its shine particles are
// not ported.
export default defineItemLook({
  items: [[2, 18]],
  held: [
    { texture: 'shiny02', bone: 5, scale: 0.5, light: [0.5, 0.8, 0.9] },
    { texture: 'lightmarks', bone: 5, scale: 1, light: [0.4, 0.7, 0.9] },
    { texture: 'shiny02', bone: 6, scale: 1.1, light: [0.5, 0.6, 0.9] },
    { texture: 'shiny02', bone: 2, scale: 0.5, light: [0.8, 0.5, 0.2] },
    { texture: 'shiny02', bone: 3, scale: 0.5, light: [0.8, 0.5, 0.2] },
    { texture: 'flare', bone: 4, scale: ms => 0.5 * Math.abs(Math.sin(ms * 0.0015)), light: [1, 1, 1] },
  ],
});
