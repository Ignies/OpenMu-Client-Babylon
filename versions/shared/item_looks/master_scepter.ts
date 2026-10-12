import { defineItemLook, fixedLight, randomTurn } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';

const blue: LookLight = (ms, _body, out) => {
  const l = Math.sin(ms * 0.002) * 0.35 + 0.65;
  out.set(l * 0.6, l * 0.8, l);
};
const flare = (bone: number): HeldSprite => ({ texture: 'flare01', bone, offset: [-10, 0, 0], scale: 1, light: blue });

// MODEL_MASTER_SCEPTER (ZzzObject.cpp:7086-7097): the body lit, mesh 0 again as the blend mesh in blue
// at a pulsing BlendMeshLight, then mesh 1 as the blend mesh with Chrome01 on its UVs, scrolling.
// Carried (ZzzCharacter.cpp:7594-7611): a pulsing blue flare 10 cm off bones 2-5, a randomly turned
// Shiny02 with the one on 4.
export default defineItemLook({
  items: [[2, 9]],
  body: {
    passes: [
      { mesh: 0, kind: 'add', light: fixedLight(0.1, 0.3, 1), gain: ms => Math.max(0, Math.sin(ms * 0.001) * 0.6 + 0.4) },
      { mesh: 1, kind: 'add', texture: 'Effect/Chrome01.OZJ', light: fixedLight(0.6, 0.8, 1), v: ms => ms * 0.0003 },
    ],
  },
  held: [
    flare(2),
    flare(3),
    flare(4),
    { texture: 'shiny02', bone: 4, offset: [-10, 0, 0], scale: 0.6, light: [0.5, 0.5, 0.5], rotation: randomTurn },
    flare(5),
  ],
});
