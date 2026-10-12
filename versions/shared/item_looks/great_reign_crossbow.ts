import { defineItemLook, luminous } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const blue = luminous(0.5, 0.5, 0.8);

// MODEL_GREAT_REIGN_CROSSBOW carried (ZzzCharacter.cpp:7539-7557): a blue Shiny02 and a flare 10 cm off
// bones 1-5, the last flare white.
export default defineItemLook({
  items: [[4, 19]],
  held: [1, 2, 3, 4, 5].flatMap((bone): HeldSprite[] => [
    { texture: 'shiny02', bone, offset: [0, 0, 10], scale: 1, light: blue },
    { texture: 'flare01', bone, offset: [0, 0, 10], scale: 2, light: bone === 5 ? [1, 1, 1] : blue },
  ]),
});
