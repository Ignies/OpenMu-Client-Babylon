import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_SALAMANDER_SHIELD (ZzzObject.cpp:7167-7171): mesh 1 hidden from the lit body, drawn additive.
// Carried (ZzzCharacter.cpp:8144-8166): a red flare at Zx01 (bone 1); its fire
// particles are not ported.
export default defineItemLook({
  items: [[6, 18]],
  body: { passes: [{ mesh: 1, kind: 'bright' }] },
  held: [{ texture: 'flare01', bone: 1, scale: 2, light: [0.9, 0, 0.2] }],
});
