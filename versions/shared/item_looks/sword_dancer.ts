import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';
import type { Vector3 } from '@/controllers/render/babylon/exports';

/** `sinf(WorldTime * 0.7f) * 0.2f + 0.3f`, the impact's and the drop's pulse. */
const pulse = (ms: number) => Math.sin(ms * 0.7) * 0.2 + 0.3;

/**
 * The drop: a static `fPosition` grows 1.5 a frame to past 20, then starts again on a bone `rand() % 5 + 2`
 * picks. Counted here in 25 Hz frames, 15 to a cycle; the bone is a hash of the cycle.
 */
const FRAME_MS = 40;
const dropBone = (ms: number) => {
  const cycle = Math.floor(ms / FRAME_MS / 15);
  return 2 + (((cycle * 2654435761) >>> 0) % 5);
};
const dropAt = (ms: number, out: Vector3): void => {
  const k = Math.floor(ms / FRAME_MS) % 15;
  out.set(0, k === 14 ? 0 : (k + 1) * 1.5, 0);
};
const dropLight: LookLight = (ms, _body, out) => {
  out.set(1 - pulse(ms), 0, 0);
};
const drop = (bone: number): HeldSprite[] => [
  { texture: 'waterfall4', bone, offset: dropAt, scale: ms => (dropBone(ms) === bone ? 0.7 : 0), light: dropLight },
  { texture: 'waterfall2', bone, offset: dropAt, scale: ms => (dropBone(ms) === bone ? 0.3 : 0), light: [0.1, 0.1, 0.1] },
];
const flareLight: LookLight = (ms, _body, out) => {
  out.set(0.8 + Math.sin(ms * 0.4) * 0.25 + 0.2, 0.1, 0);
};

// MODEL_SWORD_DANCER (ZzzObject.cpp:7638-7644): mesh 1 hidden from the body, drawn as lava at
// alpha 0.5 (alpha tested, lit), then itself as the blend mesh scrolling down.
// Carried (ZzzCharacter.cpp:7255-7318): a red flare and a turning impact at bone 1, a drop running down
// one of bones 2-6, flares on 2-6. Its sparks while running are not ported.
export default defineItemLook({
  items: [[0, 25]],
  body: {
    drawn: [0],
    passes: [
      { mesh: 1, kind: 'blend', texture: 'Effect/lava.OZJ', clamp: true, alpha: 0.5 },
      { mesh: 1, kind: 'add', v: ms => ms * 0.0009 },
    ],
  },
  held: [
    { texture: 'flare01', bone: 1, scale: 1, light: [1, 0.1, 0] },
    {
      texture: 'impact01',
      bone: 1,
      scale: () => Math.floor(Math.random() * 30) / 60 + 0.2,
      light: (ms, _body, out) => out.set(0.1 + pulse(ms), 0.2, 0),
      rotation: ms => ms * 0.0006 * 360,
    },
    ...[2, 3, 4, 5, 6].flatMap(drop),
    ...[2, 3, 4, 5, 6].map((bone): HeldSprite => ({ texture: 'flare01', bone, scale: 1.1, light: flareLight })),
  ],
});
