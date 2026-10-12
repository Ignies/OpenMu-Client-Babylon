import { defineItemLook, heldLuminosity } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

// MODEL_DRAGON_SPEAR (ZzzObject.cpp:7050-7054): the body lit (mesh 1 hidden, ItemObjectAttribute), then
// mesh 1 as the blend mesh, scrolling. Carried (ZzzCharacter.cpp:7721-7730): blue flares on bones 1-8.
export default defineItemLook({
  items: [[3, 10]],
  body: { passes: [{ mesh: 1, kind: 'bright', u: ms => ms * 0.0001, v: ms => ms * 0.0005 }] },
  held: [1, 2, 3, 4, 5, 6, 7, 8].map(
    (bone): HeldSprite => ({
      texture: 'flare01',
      bone,
      scale: 1.3,
      light: (ms, _body, out) => {
        const l = heldLuminosity(ms);
        out.set(l * 0.2, l * 0.1, l * 0.8);
      },
    })
  ),
});
