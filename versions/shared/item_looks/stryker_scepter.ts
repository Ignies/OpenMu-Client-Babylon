import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter } from '@/controllers/item_fx/itemLooks';
import { NO_TURN, spawnParticle } from '@/controllers/fx/effectParticles';

const BLUE = [0.4, 0.6, 0.9] as const;
/**
 * `if (int(WorldTime) % 14 == 0)` a Shiny+6 SubType 1 at rx01: one frame in 14, read as `rand_fps_check(14)`.
 * Its two sheets are spawned together, the flare on the shine's rolls.
 */
const shine: HeldEmitter = {
  bone: 5,
  emit(scene, at, _wearer, dt) {
    if (Math.random() * 14 >= dt * 25) return;
    void spawnParticle(scene, 'shiny6_1', at, NO_TURN, 1, BLUE);
    void spawnParticle(scene, 'light6_1', at, NO_TURN, 1, BLUE);
  },
};

// MODEL_STRYKER_SCEPTER carried (ZzzCharacter.cpp:8310-8344): a Shiny02 and light marks at rx01 (bone 5),
// a bigger Shiny02 at rx02 (6), gold ones at bones 2 and 3, a pulsing Flare at 4, and now and then a shine
// thrown off rx01.
export default defineItemLook({
  items: [[2, 18]],
  emit: [shine],
  held: [
    { texture: 'shiny02', bone: 5, scale: 0.5, light: [0.5, 0.8, 0.9] },
    { texture: 'lightmarks', bone: 5, scale: 1, light: [0.4, 0.7, 0.9] },
    { texture: 'shiny02', bone: 6, scale: 1.1, light: [0.5, 0.6, 0.9] },
    { texture: 'shiny02', bone: 2, scale: 0.5, light: [0.8, 0.5, 0.2] },
    { texture: 'shiny02', bone: 3, scale: 0.5, light: [0.8, 0.5, 0.2] },
    { texture: 'flare', bone: 4, scale: ms => 0.5 * Math.abs(Math.sin(ms * 0.0015)), light: [1, 1, 1] },
  ],
});
