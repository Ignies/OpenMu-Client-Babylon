import { defineItemLook, luminous } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const blue = luminous(0.5, 0.5, 0.8);

// MODEL_GREAT_REIGN_CROSSBOW (ZzzObject.cpp:7002-7012): mesh 0 again as the blend mesh, Chrome01 on its UVs
// in violet off the body's light sweeping back along u, then bab2 (BITMAP_CHROME + 1) by the chrome
// look-up, additive; the body lit.
// Carried (ZzzCharacter.cpp:7539-7557): a blue Shiny02 and a flare 10 cm off
// bones 1-5, the last flare white.
export default defineItemLook({
  items: [[4, 19]],
  body: {
    passes: [
      {
        mesh: 0,
        kind: 'add',
        texture: 'Effect/Chrome01.OZJ',
        light: (_ms, body, out) => out.set(0.8 * body.x, 0, 0.8 * body.z),
        u: ms => -ms * 0.0002,
      },
      { mesh: 0, kind: 'add', texture: 'Effect/bab2.OZJ', map: 'chrome' },
    ],
  },
  held: [1, 2, 3, 4, 5].flatMap((bone): HeldSprite[] => [
    { texture: 'shiny02', bone, offset: [0, 0, 10], scale: 1, light: blue },
    { texture: 'flare01', bone, offset: [0, 0, 10], scale: 2, light: bone === 5 ? [1, 1, 1] : blue },
  ]),
});
