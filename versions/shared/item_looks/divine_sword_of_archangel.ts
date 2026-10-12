import { defineItemLook, luminous, oneIn, randomTurn } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, MeshPass } from '@/controllers/item_fx/itemLooks';

const RED = luminous(1, 0.3, 0.1);

/** The Archangel weapons' glint: a red flare, with a grey Shiny02 at a random turn one frame in three. */
export const archangelGlint = (bone: number, offset?: readonly [number, number, number]): HeldSprite[] => [
  { texture: 'shiny02', bone, offset, scale: oneIn(3, 0.6), light: [0.4, 0.4, 0.4], rotation: randomTurn },
  { texture: 'flare01', bone, offset, scale: 2, light: RED },
];

/**
 * The Archangel weapons' mesh 0: RENDER_METAL, Shiny01 by the normal at flat BodyLight in place of its lit
 * pass (a chrome flag, opaque), then RENDER_LIGHTMAP as the blend mesh, Chrome01 on its UVs scrolling on
 * v by `rate` (ms).
 */
export const archangelMetal = (rate: number): MeshPass[] => [
  { mesh: 0, kind: 'unlit', texture: 'Effect/Shiny01.OZJ', clamp: true, map: 'metal' },
  { mesh: 0, kind: 'add', texture: 'Effect/Chrome01.OZJ', v: ms => ms * rate },
];

// MODEL_DIVINE_SWORD_OF_ARCHANGEL (ZzzObject.cpp:6979-6984): mesh 0 metal and a Chrome01 sweep, mesh 1 lit.
// Carried (ZzzCharacter.cpp:7489-7520): a glint on bones 2-8.
export default defineItemLook({
  items: [[0, 19]],
  body: { drawn: [1], passes: archangelMetal(0.0001) },
  held: [2, 3, 4, 5, 6, 7, 8].flatMap(bone => archangelGlint(bone)),
});
