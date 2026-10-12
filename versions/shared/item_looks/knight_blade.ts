import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const pulse = (ms: number) => Math.sin(ms * 0.002) * 0.35 + 0.65;

/**
 * RenderLinkObject's MODEL_KNIGHT_BLADE case (ZzzCharacter.cpp:7661-7673), on one
 * bone: a violet flare and a grey one (a negative scale draws the sprite mirrored, the same size).
 */
const violetFlares = (bone: number): HeldSprite[] => [
  {
    texture: 'flare01',
    bone,
    scale: ms => pulse(ms) * 0.9,
    light: (ms, _body, out) => {
      const l = pulse(ms);
      out.set(l * 0.43, l * 0.14, l * 0.6);
    },
  },
  { texture: 'flare01', bone, scale: ms => Math.abs(Math.sin(ms * 0.002) * 0.5 + 0.4), light: [0.3, 0.3, 0.3] },
];

// MODEL_KNIGHT_BLADE (ZzzObject.cpp:7548-7557): the body lit, mesh 2 again at a pulsing
// BlendMeshLight (a negative glColor draws nothing), mesh 1 again, Chrome01 on the edge (mesh 3).
// Carried: the violet flares on bones 1 and 2.
export default defineItemLook({
  items: [[0, 20]],
  body: {
    passes: [
      { mesh: 2, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.0008) * 0.7 + 0.5) },
      { mesh: 1, kind: 'add' },
      { mesh: 3, kind: 'add', ...CHROME01 },
    ],
  },
  held: [...violetFlares(1), ...violetFlares(2)],
});
