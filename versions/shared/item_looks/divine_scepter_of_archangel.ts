import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import { archangelGlint } from './divine_sword_of_archangel';

// MODEL_DIVINE_SCEPTER_OF_ARCHANGEL (ZzzObject.cpp:6997-7001): mesh 0 lit, then again as the blend mesh,
// Chrome01 on its UVs scrolling back down v; no other mesh.
// Carried (ZzzCharacter.cpp:7647-7660): one glint at bone 0.
export default defineItemLook({
  items: [[2, 13]],
  body: { drawn: [0], passes: [{ mesh: 0, kind: 'add', texture: 'Effect/Chrome01.OZJ', v: ms => -ms * 0.0001 }] },
  held: archangelGlint(0),
});
