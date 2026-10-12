import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const PINK = [0.9, 0.2, 0.7] as const;
const gem = (bone: number): HeldSprite[] => [
  { texture: 'shiny05', bone, scale: 0.8, light: PINK },
  { texture: 'shiny05', bone, scale: 0.3, light: PINK },
];

// MODEL_BEUROBA carried (ZzzCharacter.cpp:8291-8309): two pink shiny05 at Zx01 and Zx02 (bones 3 and 4), a
// green flare at bone 5.
export default defineItemLook({
  items: [[3, 11]],
  held: [...gem(3), ...gem(4), { texture: 'flare01', bone: 5, scale: 1.5, light: [0.2, 0.9, 0.1] }],
});
