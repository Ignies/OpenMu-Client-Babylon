import { defineItemLook, frameRolls } from '@/controllers/item_fx/itemLooks';

const roll = frameRolls();
const turn = (ms: number) => Math.floor(roll(ms, 0) * 360);

// MODEL_GREAT_LORD_SCEPTER (ZzzObject.cpp:7925-7930): the body lit, meshes 1 and 3 again as blend meshes.
// Carried (ZzzCharacter.cpp:7474-7488): a pulsing blue flare and two Shiny02 turned both ways at bone 1.
export default defineItemLook({
  items: [[2, 12]],
  body: { passes: [{ mesh: 1, kind: 'add' }, { mesh: 3, kind: 'add' }] },
  held: [
    {
      texture: 'flare01',
      bone: 1,
      scale: 2,
      light: (ms, _body, out) => {
        const l = Math.sin(ms * 0.002) * 0.3 + 0.7;
        out.set(0, l * 0.5, l);
      },
    },
    { texture: 'shiny02', bone: 1, scale: 1, light: [0.5, 0.5, 0.5], rotation: turn },
    { texture: 'shiny02', bone: 1, scale: 1, light: [0.5, 0.5, 0.5], rotation: ms => 360 - turn(ms) },
  ],
});
