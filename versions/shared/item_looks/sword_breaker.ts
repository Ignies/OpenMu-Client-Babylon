import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

// MODEL_SWORD_BREAKER (ZzzObject.cpp:7115-7119): the body lit, Chrome01 over mesh 1.
// Carried (ZzzCharacter.cpp:7765-7795): green light marks on bones 1-7; its drops are not ported.
export default defineItemLook({
  items: [[0, 27]],
  body: { passes: [{ mesh: 1, kind: 'add', ...CHROME01 }] },
  held: [0.6, 0.5, 0.5, 0.5, 0.4, 0.3, 0.3].map((scale, i): HeldSprite => ({ texture: 'lightmarks', bone: i + 1, scale, light: [0.1, 0.9, 0.1] })),
});
