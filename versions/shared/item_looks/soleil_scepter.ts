import { defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';
import type { Vector3 } from '@/controllers/render/babylon/exports';

const roll = frameRolls();
const ORANGE = [1, 0.3, 0] as const;
/** A point `y` cm along bone 0, jittered by the frame's k-th roll of `rand() % range / 20 - range / 40`. */
const jittered =
  (y: number, k: number, range: number) =>
  (ms: number, out: Vector3): void => {
    const at = Math.floor(roll(ms, k) * range) / 20 - range / 40;
    out.set(0, y + at, at);
  };
const size = (k: number, range: number, base: number) => (ms: number) => Math.floor(roll(ms, k) * range) / 20 + base;
const sun = jittered(-100, 0, 60);
const sunSize = size(1, 10, 1.4);
const glowSize = size(3, 10, 1);
const tail = jittered(100, 4, 40);
const tailSize = size(5, 8, 0.4);
const sprite = (offset: HeldSprite['offset'], scale: HeldSprite['scale'], texture: HeldSprite['texture'], rotation?: number): HeldSprite => ({
  texture,
  bone: 0,
  offset,
  scale,
  light: ORANGE,
  rotation: rotation === undefined ? undefined : () => rotation,
});

// MODEL_SOLEIL_SCEPTER (ZzzObject.cpp:7576-7599): mesh 0 as the StreamMesh (unlit), then again additive
// with Chrome06 on its own UVs, swept on both axes.
// Carried (ZzzCharacter.cpp:7104-7128): two Shiny02 and a flare at the head's jittered point (100 cm up
// bone 0) and two smaller Shiny02 at the other end, all orange.
export default defineItemLook({
  items: [[2, 14]],
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
    sprite(sun, sunSize, 'shiny02'),
    sprite(sun, ms => sunSize(ms) - 0.3, 'shiny02', 20),
    sprite(jittered(-100, 2, 60), ms => glowSize(ms) + 0.3, 'flare01'),
    sprite(tail, tailSize, 'shiny02'),
    sprite(tail, ms => tailSize(ms) - 0.2, 'shiny02', 90),
  ],
});
