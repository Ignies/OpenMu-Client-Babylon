import { defineItemLook, fixedLight } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';
import type { Vector3 } from '@/controllers/render/babylon/exports';

/** The frame's `rand()` rolls, shared by its sprites: the jittered point and the Shiny02 size. */
const roll = { ms: -1, at: 0, size: 0 };
function rolled(ms: number): typeof roll {
  if (roll.ms !== ms) {
    roll.ms = ms;
    roll.at = Math.floor(Math.random() * 60) / 20 - 1.5;
    roll.size = Math.floor(Math.random() * 30) / 20 + 1.5;
  }
  return roll;
}

const jittered = (ms: number, out: Vector3): void => {
  const { at } = rolled(ms);
  out.set(0, at, at);
};
const light: LookLight = (ms, _body, out) => {
  out.set(0.2, 0.2, Math.sin(ms * 0.7) * 0.2 + 0.5);
};
const turn = (ms: number) => ms * 0.0006 * 360;
const flare = (bone: number, scale: number, offset?: HeldSprite['offset']): HeldSprite => ({ texture: 'flare01', bone, offset, scale, light });

// MODEL_EXPLOSION_BLADE (ZzzObject.cpp:7600-7613): the body lit, mesh 0 again as the blend mesh,
// then 2 and 1 additive (blend mesh -2) in a faint blue pulse and in blue.
// Carried (ZzzCharacter.cpp:7143-7175): two turning Shiny02 and a flare at a jittering point of bone 4,
// flares down the blade.
export default defineItemLook({
  items: [[0, 23]],
  body: {
    passes: [
      { mesh: 0, kind: 'add' },
      {
        mesh: 2,
        kind: 'add',
        light: (ms, _body, out) => {
          const l = Math.sin(ms * 0.0015) * 0.03 + 0.3;
          out.set(l, l, l + 0.1);
        },
      },
      { mesh: 1, kind: 'add', light: fixedLight(0.4, 0.4, 0.8) },
    ],
  },
  held: [
    { texture: 'shiny02', bone: 4, offset: jittered, scale: ms => rolled(ms).size, light, rotation: turn },
    { texture: 'shiny02', bone: 4, offset: jittered, scale: ms => rolled(ms).size - 0.4, light, rotation: ms => 90 + turn(ms) },
    flare(4, 2.3, jittered),
    flare(4, 2, [30, 0, 0]),
    flare(6, 2),
    flare(7, 2),
    flare(8, 1),
  ],
});
