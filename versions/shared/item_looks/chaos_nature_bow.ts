import { defineItemLook, luminous } from '@/controllers/item_fx/itemLooks';

// MODEL_CHAOS_NATURE_BOW carried (ZzzCharacter.cpp:7036-7042): a green Shiny02 on bones 13-18.
export default defineItemLook({
  items: [[4, 6]],
  held: [13, 14, 15, 16, 17, 18].map(bone => ({ texture: 'shiny02', bone, scale: 1, light: luminous(0.6, 1, 0.8) })),
});
