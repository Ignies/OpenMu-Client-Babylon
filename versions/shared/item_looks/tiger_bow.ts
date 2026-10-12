import { defineItemLook, luminous } from '@/controllers/item_fx/itemLooks';

// MODEL_TIGER_BOW and MODEL_SILVER_BOW carried (ZzzCharacter.cpp:7032-7059): an amber Shiny02 on bones 2
// and 6 (RenderBrightEffect), in the frame's Luminosity.
export default defineItemLook({
  items: [
    [4, 4],
    [4, 5],
  ],
  held: [2, 6].map(bone => ({ texture: 'shiny02', bone, scale: 1, light: luminous(1, 0.6, 0.2) })),
});
