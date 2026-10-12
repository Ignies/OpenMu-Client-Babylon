import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

// MODEL_GUARDIAN_SHILED (ZzzObject.cpp:7180-7184): the body lit, mesh 1 again additive.
// Carried (ZzzCharacter.cpp:8167-8190): a violet flare pulsing at |sin| + 0.1 on
// bones 1-9.
export default defineItemLook({
  items: [[6, 20]],
  body: { passes: [{ mesh: 1, kind: 'add' }] },
  held: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (bone): HeldSprite => ({
      texture: 'flare01',
      bone,
      scale: 1.5,
      light: (ms, _body, out) => {
        const l = Math.abs(Math.sin(ms * 0.001)) + 0.1;
        out.set(0.8 * l, 0.3 * l, 0.8 * l);
      },
    })
  ),
});
