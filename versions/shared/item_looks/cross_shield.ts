import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

/** A flare pulsing at `|sin(WorldTime * 0.001)| + 0.1` in `(r, g, b)`. */
const flare = (bone: number, scale: number, r: number, g: number, b: number): HeldSprite => ({
  texture: 'flare01',
  bone,
  scale,
  light: (ms, _body, out) => {
    const l = Math.abs(Math.sin(ms * 0.001)) + 0.1;
    out.set(r * l, g * l, b * l);
  },
});

// MODEL_CROSS_SHIELD (ZzzObject.cpp:7185-7191): mesh 0 lit, Chrome01 additive in place of mesh 1 (a chrome
// pass takes no scroll), mesh 2 additive in place.
// Carried (ZzzCharacter.cpp:8191-8220): pulsing blue flares on bones 4-7, teal ones on
// 8-13.
export default defineItemLook({
  items: [[6, 21]],
  body: { drawn: [0], passes: [{ mesh: 1, kind: 'bright', ...CHROME01 }, { mesh: 2, kind: 'bright' }] },
  held: [...[4, 5, 6, 7].map(bone => flare(bone, 1.2, 0.2, 0.2, 0.8)), ...[8, 9, 10, 11, 12, 13].map(bone => flare(bone, 1.4, 0.2, 0.6, 0.6))],
});
