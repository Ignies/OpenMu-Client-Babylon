import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter, HeldSprite } from '@/controllers/item_fx/itemLooks';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { NO_TURN, spawnParticle } from '@/controllers/fx/effectParticles';

const GREEN = [0.5, 0.8, 0.5] as const;
const RED = [0.9, 0.1, 0.3] as const;
const FROST = [0.5, 0.8, 0.6] as const;
const CLOUD = [0.5, 0.8, 0.8] as const;
const sprite = (texture: HeldSprite['texture'], bone: number, scale: number, light: readonly [number, number, number], rotation?: (ms: number) => number): HeldSprite => ({ texture, bone, scale, light, rotation });

const at = new Vector3();
/** `(rand() % 20 - 10) * 3` cm, in tiles. */
const spread = () => ((Math.floor(Math.random() * 20) - 10) * 3) / 100;
/**
 * At the head (bone 24): on `rand_fps_check(3)` a Clud64 SubType 9 (smoke01 one time in two) 15 cm under it;
 * on `rand_fps_check(10)` a MODEL_STAR_SHINE up to 30 cm off it (ZzzCharacter.cpp:7871-7889).
 */
const frost: HeldEmitter = {
  bone: 24,
  emit(scene, head, _wearer, dt) {
    if (Math.random() * 3 < dt * 25) {
      at.set(head.x, head.y - 0.15, head.z);
      void spawnParticle(scene, Math.random() < 0.5 ? 'frostCloud' : 'frostSmoke', at, NO_TURN, 0.4, CLOUD);
    }
    if (Math.random() * 10 < dt * 25) {
      at.set(head.x + spread(), head.y + spread(), head.z + spread());
      void spawnParticle(scene, 'starShine', at, NO_TURN, 0.22, FROST);
    }
  },
};

// MODEL_FROST_MACE (ZzzObject.cpp:7128-7134): the body lit but mesh 1, then 1 and 2 additive (its
// mesh 3 call finds no mesh: the model has three).
// Carried (ZzzCharacter.cpp:7840-7927): shiny05 at the gems, a flare and three turning pin lights at the
// head (bone 24), flares up the shaft; frost sinking 15 cm under the head and stars twinkling round it.
export default defineItemLook({
  items: [[2, 16]],
  body: { passes: [{ mesh: 1, kind: 'bright' }, { mesh: 2, kind: 'add' }] },
  emit: [frost],
  held: [
    sprite('shiny05', 11, 0.2, GREEN),
    sprite('shiny05', 10, 0.2, GREEN),
    sprite('shiny05', 9, 0.2, RED),
    sprite('shiny05', 8, 0.2, RED),
    sprite('shiny05', 1, 0.2, RED),
    sprite('flare01', 1, 0.8, RED),
    sprite('shiny05', 24, 0.3, FROST),
    sprite('flare01', 24, 2, FROST),
    sprite('pinLight', 24, 0.5, FROST, ms => Math.floor(ms * 0.04) % 360),
    sprite('pinLight', 24, 0.7, FROST, ms => -(Math.floor(ms * 0.03) % 360)),
    sprite('pinLight', 24, 0.9, FROST, ms => Math.floor(ms * 0.02) % 360),
    ...[0.2, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.4, 0.4].map((scale, i) => sprite('flare01', i + 12, scale, FROST)),
  ],
});
