import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter } from '@/controllers/item_fx/itemLooks';
import { spawnParticle } from '@/controllers/fx/effectParticles';

const turn = { x: 0, y: 0, z: 0 };
/** A green Spark03 SubType 14 of 0.05 on the frames `rand_fps_check(2)` passes, along the wearer's facing. */
const spark = (bone: number): HeldEmitter => ({
  bone,
  emit(scene, at, wearer, dt) {
    if (Math.random() * 2 >= dt * 25) return;
    turn.y = -wearer.yaw;
    void spawnParticle(scene, 'spark1_14', at, turn, 0.05, [0.3, 0.9, 0.2]);
  },
});

// MODEL_ALBATROSS_BOW (ZzzObject.cpp:7649-7656): mesh 1 hidden from the body and drawn as the blend
// mesh, mesh 2 again additive, then RENDER_CHROME5 at alpha 0.5 (BodyLight halved); CHROME5 binds no
// bitmap, so it draws mesh 2's own art, still bound.
// Carried (ZzzCharacter.cpp:7344-7376): green flares and sparks on bones 10, 28, 34 and 16 (the sparks one
// roll for all four in the original, one each here).
export default defineItemLook({
  items: [[4, 22]],
  emit: [10, 28, 34, 16].map(spark),
  body: {
    passes: [
      { mesh: 1, kind: 'bright' },
      { mesh: 2, kind: 'add' },
      { mesh: 2, kind: 'add', map: 'chrome5', gain: () => 0.5 },
    ],
  },
  held: [10, 28, 34, 16].map(bone => ({ texture: 'flare01', bone, scale: 1.2, light: [0, 0.7, 0] })),
});
