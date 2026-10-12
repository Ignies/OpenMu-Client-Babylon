import { defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';
import type { Vector3 } from '@/controllers/render/babylon/exports';
import { VIOLET, energyTrail } from './imperial_sword';
import { spark11 } from './sylph_wind_bow';

const roll = frameRolls();
/** The head's jitter, `rand() % 60 / 20 - 1.5` on y and z; every head sprite stays at the first roll's point. */
const head = (ms: number, out: Vector3): void => {
  const at = Math.floor(roll(ms, 0) * 60) / 20 - 1.5;
  out.set(0, -170 + at, at);
};
const glowSize = (ms: number) => Math.floor(roll(ms, 2) * 15) / 20 + 1;
const turn = (ms: number) => ms * 0.0006 * 360;
const violet: LookLight = (ms, _body, out) => {
  const l = Math.sin(ms * 0.7) * 0.2 + 0.5;
  out.set(l - 0.1, 0.1, l - 0.1);
};
const star = (bone: number, offset: readonly [number, number, number], big: number, small: number): HeldSprite[] => [
  { texture: 'shiny02', bone, offset, scale: big, light: violet, rotation: turn },
  { texture: 'shiny02', bone, offset, scale: small, light: violet, rotation: ms => 90 + turn(ms) },
];

// MODEL_GRAND_VIPER_STAFF (ZzzObject.cpp:7576-7599): mesh 0 as the StreamMesh (unlit), then again
// additive with energy01 (BITMAP_CHROME_ENERGY) on its own UVs, swept on both axes.
// Carried (ZzzCharacter.cpp:7176-7223): Spark03, a pink flare and two Shiny02 at a jittering point of the
// head, three turning violet stars down the shaft; a violet energy trail and pink sparks off the head (its
// +-1.5 cm jitter left out).
export default defineItemLook({
  items: [[5, 12]],
  emit: [energyTrail(0, VIOLET, 30, [0, -170, 0]), spark11(0, 1, 2, [1, 0.4, 1], [0, -170, 0])],
  body: {
    passes: [
      { mesh: 0, kind: 'unlit' },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Effect/energy01.OZJ',
        clamp: true,
        u: ms => (Math.floor(ms) % 2000) * 0.0002 - 0.3,
        v: ms => (Math.floor(ms) % 2000) * 0.0002 - 0.3,
      },
    ],
  },
  held: [
    { texture: 'spark03', bone: 0, offset: head, scale: ms => Math.floor(roll(ms, 1) * 15) / 20 + 1.8, light: [0.4, 0.4, 0.4] },
    { texture: 'flare01', bone: 0, offset: head, scale: glowSize, light: [1, 0.4, 1] },
    { texture: 'shiny02', bone: 0, offset: head, scale: glowSize, light: [1, 0.4, 1] },
    { texture: 'shiny02', bone: 0, offset: head, scale: ms => glowSize(ms) - 0.3, light: [1, 0.4, 1], rotation: () => 90 },
    ...star(2, [0, 10, 0], 1.5, 1.2),
    ...star(1, [-40, -10, 0], 1, 0.7),
    ...star(1, [-160, -5, 0], 1.2, 1),
  ],
});
