import { defineItemLook, luminous, oneIn, randomTurn } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const RED = luminous(1, 0.3, 0.1);

/** The Archangel weapons' glint: a red flare, with a grey Shiny02 at a random turn one frame in three. */
export const archangelGlint = (bone: number, offset?: readonly [number, number, number]): HeldSprite[] => [
  { texture: 'shiny02', bone, offset, scale: oneIn(3, 0.6), light: [0.4, 0.4, 0.4], rotation: randomTurn },
  { texture: 'flare01', bone, offset, scale: 2, light: RED },
];

// MODEL_DIVINE_SWORD_OF_ARCHANGEL carried (ZzzCharacter.cpp:7489-7520): a glint on bones 2-8.
export default defineItemLook({
  items: [[0, 19]],
  held: [2, 3, 4, 5, 6, 7, 8].flatMap(bone => archangelGlint(bone)),
});
