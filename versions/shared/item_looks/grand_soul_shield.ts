import { defineItemLook, heldLuminosity, luminous } from '@/controllers/item_fx/itemLooks';

const blue = luminous(0.6, 0.6, 2);

// MODEL_GRAND_SOUL_SHIELD carried (ZzzCharacter.cpp:7558-7565): a blue Shiny02 and a flare of the frame's
// Luminosity + 1.5 at a point of bone 1.
export default defineItemLook({
  items: [[6, 15]],
  held: [
    { texture: 'shiny02', bone: 1, offset: [15, -15, 0], scale: 1.5, light: blue },
    { texture: 'flare01', bone: 1, offset: [15, -15, 0], scale: ms => heldLuminosity(ms) + 1.5, light: blue },
  ],
});
