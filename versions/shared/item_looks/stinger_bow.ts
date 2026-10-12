import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_STINGER_BOW carried (ZzzCharacter.cpp:7970-7997): a grey flare on every bone 0-43 but 1. Its
// feathers at the shot read two points it never sets, so they are not ported.
export default defineItemLook({
  items: [[4, 23]],
  held: Array.from({ length: 44 }, (_, i) => i)
    .filter(bone => bone !== 1)
    .map(bone => ({ texture: 'flare01', bone, scale: 0.8, light: [0.2, 0.25, 0.3] })),
});
