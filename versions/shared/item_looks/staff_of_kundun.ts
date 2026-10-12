import { CHROME01, defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite } from '@/controllers/item_fx/itemLooks';

const roll = frameRolls();
/** The frame's `rand() % 360`, one turn shared by every star. */
const turn = (ms: number) => Math.floor(roll(ms, 0) * 360);
const gem = (bone: number, flare: number, star: number): HeldSprite[] => [
  {
    texture: 'flare01',
    bone,
    scale: flare,
    light: (ms, _body, out) => {
      const l = Math.sin(ms * 0.002) * 0.3 + 0.7;
      out.set(0, l * 0.5, l);
    },
  },
  { texture: 'shiny02', bone, scale: star, light: [0.5, 0.5, 0.5], rotation: turn },
  { texture: 'shiny02', bone, scale: star, light: [0.5, 0.5, 0.5], rotation: ms => 360 - turn(ms) },
];

// MODEL_STAFF_OF_KUNDUN (ZzzObject.cpp:7906-7913): the body lit (mesh 2 its blend mesh), Chrome01 over
// mesh 1, mesh 0 again flickering (sinf, nothing below 0), then Chrome02 over it by the CHROME4 look-up.
// Carried (ZzzCharacter.cpp:7444-7473): a pulsing blue flare and two Shiny02 turned both ways on bones 5,
// 6 and (larger) 8.
export default defineItemLook({
  items: [[5, 11]],
  body: {
    passes: [
      { mesh: 1, kind: 'add', ...CHROME01 },
      { mesh: 0, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.005)) },
      { mesh: 0, kind: 'add', texture: 'Effect/Chrome02.OZJ', clamp: true, map: 'chrome4' },
    ],
  },
  held: [...gem(5, 1, 0.5), ...gem(6, 1, 0.5), ...gem(8, 2, 1)],
});
