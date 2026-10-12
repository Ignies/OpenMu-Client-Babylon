import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';

const PINK = [0.8, 0.1, 0.4] as const;
const GOLD = [0.8, 0.8, 0.2] as const;
const circle: LookLight = (ms, _body, out) => {
  const a = Math.abs(Math.sin(ms * 0.0008));
  out.set(0.1 + 0.8 * a, 0.1 * a, 0.1 + 0.4 * a);
};

// MODEL_CHROMATIC_STAFF carried (ZzzCharacter.cpp:8221-8251): a big flare, a pulsing magic circle and a
// gold Shiny02 at the orb (bone 8), small ones on the beads (1-7); its moon effect is not ported.
export default defineItemLook({
  items: [[5, 33]],
  held: [
    { texture: 'flare01', bone: 8, scale: 3.5, light: [0.9, 0.1, 0.4] },
    { texture: 'magicGround1', bone: 8, scale: 0.3, light: circle },
    { texture: 'shiny02', bone: 8, scale: 1, light: GOLD },
    ...[1, 2, 3, 4, 5, 6, 7].flatMap((bone): HeldSprite[] => [
      { texture: 'flare01', bone, scale: 0.6, light: PINK },
      { texture: 'magicGround1', bone, scale: 0.12, light: PINK },
      { texture: 'shiny02', bone, scale: 0.3, light: GOLD },
    ]),
  ],
});
