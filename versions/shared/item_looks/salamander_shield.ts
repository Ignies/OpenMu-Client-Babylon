import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter } from '@/controllers/item_fx/itemLooks';
import { NO_TURN, spawnParticle } from '@/controllers/fx/effectParticles';

/** BITMAP_FIRE_HIK1 SubType 0, BITMAP_FIRE_CURSEDLICH 4, BITMAP_FIRE_HIK3 0: one of them, at random. */
const FIRES = ['fire1', 'fire2', 'fire3'] as const;
const WHITE = [1, 1, 1] as const;
const fire: HeldEmitter = {
  bone: 1,
  emit(scene, at, _wearer, dt) {
    if (Math.random() >= dt * 25) return;
    void spawnParticle(scene, FIRES[Math.floor(Math.random() * 3)], at, NO_TURN, 0.7, WHITE);
  },
};

// MODEL_SALAMANDER_SHIELD (ZzzObject.cpp:7167-7171): mesh 1 hidden from the lit body, drawn additive.
// Carried (ZzzCharacter.cpp:8144-8166): a red flare at Zx01 (bone 1), and a white fire there every tick.
export default defineItemLook({
  items: [[6, 18]],
  emit: [fire],
  body: { passes: [{ mesh: 1, kind: 'bright' }] },
  held: [{ texture: 'flare01', bone: 1, scale: 2, light: [0.9, 0, 0.2] }],
});
