import { defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';
import type { LookLight } from '@/controllers/item_fx/itemLooks';

/** `sinf(WorldTime * 0.4f) * 0.25f + 0.7f`, in (f, f - 0.5, f - 0.5): a red that flickers every frame. */
const glint: LookLight = (ms, _body, out) => {
  const f = Math.sin(ms * 0.4) * 0.25 + 0.7;
  out.set(f, f - 0.5, f - 0.5);
};

// MODEL_BONE_BLADE (ZzzObject.cpp:7576-7599): mesh 0 as the StreamMesh (unlit), then again additive
// in amber with Chrome07 on its own UVs, swept along u (it scrolls as the StreamMesh).
// Carried (ZzzCharacter.cpp:7129-7142): two Impack03 glints either side of the hilt.
export default defineItemLook({
  items: [[0, 22]],
  body: {
    passes: [
      { mesh: 0, kind: 'unlit' },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Effect/Chrome07.OZJ',
        clamp: true,
        light: fixedLight(1, 0.7, 0.4),
        u: ms => (Math.floor(ms) % 4000) * 0.0004 - 0.7,
      },
    ],
  },
  held: [
    { texture: 'impact03', bone: 0, offset: [5, -22, -10], scale: 0.75, light: glint },
    { texture: 'impact03', bone: 0, offset: [-5, -22, -10], scale: 0.75, light: glint },
  ],
});
