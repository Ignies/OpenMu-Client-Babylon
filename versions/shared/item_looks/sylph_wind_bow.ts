import { defineItemLook } from '@/controllers/item_fx/itemLooks';

// MODEL_SYLPH_WIND_BOW (ZzzObject.cpp:7576-7599): mesh 0 as the StreamMesh (unlit), then again additive
// with Chrome06 on its own UVs, swept on both axes.
// Carried (ZzzCharacter.cpp:7077-7103): yellow flares on bones 7 and 15, three 20 cm off the grip; its
// sparks (CreateParticle) are not ported.
export default defineItemLook({
  items: [[4, 21]],
  body: {
    passes: [
      { mesh: 0, kind: 'unlit' },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Effect/Chrome06.OZJ',
        clamp: true,
        u: ms => (Math.floor(ms) % 4000) * 0.0002 - 0.3,
        v: ms => (Math.floor(ms) % 4000) * 0.0002 - 0.3,
      },
    ],
  },
  held: [
    { texture: 'flare01', bone: 7, scale: 2, light: [0.5, 0.5, 0.1] },
    { texture: 'flare01', bone: 15, scale: 2, light: [0.5, 0.5, 0.1] },
    ...[0.8, 1.3, 2].map(scale => ({ texture: 'flare01' as const, bone: 0, offset: [20, 0, 0] as const, scale, light: [1, 1, 0.4] as const })),
  ],
});
