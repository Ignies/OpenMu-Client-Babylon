import { CHROME01, defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter, HeldSprite } from '@/controllers/item_fx/itemLooks';
import { NO_TURN, spawnParticle } from '@/controllers/fx/effectParticles';

const GREEN = [0.1, 0.9, 0.1] as const;

/** A green waterFall4 drop (SubType 12, scale 0.5) on the frames `rand_fps_check(4)` passes. */
const drop = (bone: number): HeldEmitter => ({
  bone,
  emit(scene, at, _wearer, dt) {
    if (Math.random() * 4 < dt * 25) void spawnParticle(scene, 'waterfall4Glint', at, NO_TURN, 0.5, GREEN);
  },
});

// MODEL_SWORD_BREAKER (ZzzObject.cpp:7115-7119): the body lit, Chrome01 over mesh 1.
// Carried (ZzzCharacter.cpp:7765-7795): green light marks on bones 1-7, each shedding a drop now and then.
export default defineItemLook({
  items: [[0, 27]],
  body: { passes: [{ mesh: 1, kind: 'add', ...CHROME01 }] },
  held: [0.6, 0.5, 0.5, 0.5, 0.4, 0.3, 0.3].map((scale, i): HeldSprite => ({ texture: 'lightmarks', bone: i + 1, scale, light: GREEN })),
  emit: [1, 2, 3, 4, 5, 6, 7].map(drop),
});
