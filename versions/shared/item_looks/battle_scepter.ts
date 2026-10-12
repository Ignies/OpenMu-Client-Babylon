import { defineItemLook, luminous } from '@/controllers/item_fx/itemLooks';
import type { LookLight } from '@/controllers/item_fx/itemLooks';

const scale = (ms: number) => Math.sin(ms * 0.001) + 1;
const turn = (ms: number) => Math.sin(ms * 0.01) * 360;
const blue = luminous(0.2, 0.1, 3);
const grey: LookLight = (ms, _body, out) => out.setAll(Math.sin(ms * 0.001) * 0.5 + 0.5);

// MODEL_BATTLE_SCEPTER (ZzzObject.cpp:7078-7085): the body lit, then mesh 0 again as the blend mesh at
// a pulsing BlendMeshLight.
// Carried (ZzzCharacter.cpp:7576-7593): two pulsing blue flares either side of bone 1 and two grey
// Shiny02 swinging both ways at the second.
export default defineItemLook({
  items: [[2, 8]],
  body: { passes: [{ mesh: 0, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.001) * 0.6 + 0.4) }] },
  held: [
    { texture: 'flare01', bone: 1, offset: [-15, 0, 0], scale, light: blue },
    { texture: 'flare01', bone: 1, offset: [10, 0, 0], scale, light: blue },
    { texture: 'shiny02', bone: 1, offset: [10, 0, 0], scale: 0.6, light: grey, rotation: ms => 360 - turn(ms) },
    { texture: 'shiny02', bone: 1, offset: [10, 0, 0], scale: 0.6, light: grey, rotation: turn },
  ],
});
