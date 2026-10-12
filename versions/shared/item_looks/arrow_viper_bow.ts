import { defineItemLook, luminous } from '@/controllers/item_fx/itemLooks';
import type { HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';

const scale = (ms: number) => (Math.sin(ms * 0.001) + 1) * 0.8;
const grey = (ms: number) => Math.sin(ms * 0.001) * 0.3 + 0.3;
const turn = (ms: number) => Math.sin(ms * 0.01) * 360;
const red = luminous(3, 1, 1);
const blendPulse = (ms: number) => Math.sin(ms * 0.002) * 0.3 + 0.5;
const starLight: LookLight = (ms, _body, out) => {
  const l = grey(ms);
  out.set(l * 3, l, l);
};
const outOfSafeZone = (sprite: HeldSprite): HeldSprite => ({ ...sprite, bone: 9, offset: [10, 0, 0], when: w => !w.safeZone });

// MODEL_ARROW_VIPER_BOW (ZzzObject.cpp:7860-7873): meshes 0-2, 5 and 6 lit, 3 and 4 each its own blend mesh
// at a pulsing BlendMeshLight in place of its lit pass.
// Carried (ZzzCharacter.cpp:7674-7697): red flares on bones 6 and 2; out of a safe
// zone a grey flare and two Shiny02 turning both ways 10 cm off bone 9.
export default defineItemLook({
  items: [[4, 20]],
  body: {
    drawn: [0, 1, 2, 5, 6],
    passes: [
      { mesh: 3, kind: 'bright', gain: blendPulse },
      { mesh: 4, kind: 'bright', gain: blendPulse },
    ],
  },
  held: [
    { texture: 'flare01', bone: 6, scale, light: red },
    { texture: 'flare01', bone: 2, scale, light: red },
    outOfSafeZone({ texture: 'flare01', bone: 9, scale, light: (ms, _body, out) => out.setAll(grey(ms)) }),
    outOfSafeZone({ texture: 'shiny02', bone: 9, scale: 0.8, light: starLight, rotation: ms => 360 - turn(ms) }),
    outOfSafeZone({ texture: 'shiny02', bone: 9, scale: 0.8, light: starLight, rotation: turn }),
  ],
});
