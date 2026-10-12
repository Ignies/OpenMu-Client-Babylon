import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_ALBATROSS_BOW (ZzzObject.cpp:7649-7656): mesh 1 hidden from the body and drawn as the blend
// mesh, mesh 2 again additive, then RENDER_CHROME5 at alpha 0.5 (BodyLight halved); CHROME5 binds no
// bitmap, so it draws mesh 2's own art, still bound.
// Carried (ZzzCharacter.cpp:7344-7376): green flares on bones 10, 28, 34 and 16; its sparks are not ported.
export default defineItemLook({
  items: [[4, 22]],
  body: {
    passes: [
      { mesh: 1, kind: 'bright' },
      { mesh: 2, kind: 'add' },
      { mesh: 2, kind: 'add', map: 'chrome5', gain: () => 0.5 },
    ],
  },
  held: [10, 28, 34, 16].map(bone => ({ texture: 'flare01', bone, scale: 1.2, light: [0, 0.7, 0] })),
});
