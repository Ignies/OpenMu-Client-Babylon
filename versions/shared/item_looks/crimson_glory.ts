import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';

const glow: LookLight = (ms, _body, out) => out.setAll(Math.abs(Math.sin(ms * 0.0005)));

// MODEL_CRIMSONGLORY carried (ZzzCharacter.cpp:8116-8143): gold flares on bones 4-10, slowly pulsing red
// flares at Zx01, Zx02 and Zx002 (bones 1-3).
export default defineItemLook({
  items: [[6, 17]],
  held: [
    ...[4, 5, 6, 7, 8, 9, 10].map((bone): HeldSprite => ({ texture: 'flare01', bone, scale: 1.5, light: [0.8, 0.6, 0.2] })),
    { texture: 'flareRed', bone: 1, scale: 0.5, light: glow },
    { texture: 'flareRed', bone: 2, scale: 0.3, light: glow },
    { texture: 'flareRed', bone: 3, scale: 0.3, light: glow },
  ],
});
