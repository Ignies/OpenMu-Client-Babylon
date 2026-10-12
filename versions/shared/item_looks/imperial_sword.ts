import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

/** The frame's `rand() % 15 / 30 + 0.5`, shared by bones 8 and 9. */
const roll = { ms: -1, size: 0 };
const size = (ms: number) => {
  if (roll.ms !== ms) {
    roll.ms = ms;
    roll.size = Math.floor(Math.random() * 15) / 30 + 0.5;
  }
  return roll.size;
};

const gem = (bone: number): HeldSprite[] => [
  { texture: 'flareBlue', bone, scale: 0.4, light: (_ms, body, out) => out.copyFrom(body) },
  { texture: 'shiny05', bone, scale: bone < 10 ? size : 0.4, light: [0.1, 0.4, 0.9] },
];

// MODEL_IMPERIAL_SWORD (ZzzObject.cpp:7120-7127): the body lit, mesh 2 again additive, then 1 as the
// blend mesh at a pulsing BlendMeshLight.
// Carried (ZzzCharacter.cpp:7796-7839): a blue flare in the wearer's light and shiny05 on bones 8-11, blue
// light marks on 2-7; its energy trail is not ported.
export default defineItemLook({
  items: [[0, 28]],
  body: {
    passes: [
      { mesh: 2, kind: 'add' },
      { mesh: 1, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.001) * 0.6 + 0.4) },
    ],
  },
  held: [
    ...[8, 9, 10, 11].flatMap(gem),
    ...[1, 0.8, 0.6, 0.4, 0.2, 0.1].map((scale, i): HeldSprite => ({ texture: 'lightmarks', bone: i + 2, scale, light: [0, 0.3, 0.7] })),
  ],
});
