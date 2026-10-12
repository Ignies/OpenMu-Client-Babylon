import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter } from '@/controllers/item_fx/itemLooks';
import { spawnParticle } from '@/controllers/fx/effectParticles';

/** The wearer's facing as a node turn, rewritten for each spawn (spawnParticle reads it before returning). */
const turn = { x: 0, y: 0, z: 0 };

/**
 * `CreateParticle(BITMAP_SPARK + 1, p, o->Angle, Light, 11, scale)` on the frames `rand_fps_check(n)` passes: a
 * Spark03 thrown along the wearer's facing (ZzzEffectParticle.cpp:2196-2204).
 */
export const spark11 = (bone: number, n: number, scale: number, light: readonly [number, number, number], offset?: readonly [number, number, number]): HeldEmitter => ({
  bone,
  offset,
  emit(scene, at, wearer, dt) {
    if (Math.random() * n >= dt * 25) return;
    turn.y = -wearer.yaw;
    void spawnParticle(scene, 'spark1_11', at, turn, scale, light);
  },
});

// MODEL_SYLPH_WIND_BOW (ZzzObject.cpp:7576-7599): mesh 0 as the StreamMesh (unlit), then again additive
// with Chrome06 on its own UVs, swept on both axes.
// Carried (ZzzCharacter.cpp:7077-7103): yellow flares on bones 7 and 15, three 20 cm off the grip, and
// sparks off bones 4 and 12 (one roll for both in the original, one each here).
export default defineItemLook({
  items: [[4, 21]],
  emit: [spark11(4, 2, 0.8, [0.8, 0.8, 0.2]), spark11(12, 2, 0.8, [0.8, 0.8, 0.2])],
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
    { texture: 'flare01', bone: 7, scale: 2, light: [0.5, 0.5, 0.1] },
    { texture: 'flare01', bone: 15, scale: 2, light: [0.5, 0.5, 0.1] },
    ...[0.8, 1.3, 2].map(scale => ({ texture: 'flare01' as const, bone: 0, offset: [20, 0, 0] as const, scale, light: [1, 1, 0.4] as const })),
  ],
});
