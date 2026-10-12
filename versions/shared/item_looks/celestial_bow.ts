import { defineItemLook, luminous } from '@/controllers/item_fx/itemLooks';

// MODEL_CELESTIAL_BOW carried (ZzzCharacter.cpp:7043-7052): a blue Shiny02 on bones 13-18, then 5-8.
export default defineItemLook({
  items: [[4, 17]],
  held: [13, 14, 15, 16, 17, 18, 5, 6, 7, 8].map(bone => ({ texture: 'shiny02', bone, scale: 1, light: luminous(0.5, 0.5, 0.8) })),
});
