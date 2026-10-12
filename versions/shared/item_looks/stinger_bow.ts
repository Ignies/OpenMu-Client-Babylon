import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter } from '@/controllers/item_fx/itemLooks';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { MODEL, effects, fxNow } from '@/controllers/fx';
import { TICK } from '@/controllers/fx/core';

const GREY = [0.2, 0.25, 0.3] as const;
const DEG = Math.PI / 180;
const SUBS = [0, 1, 0, 1] as const;
const at = new Vector3();
const rand = (n: number) => Math.floor(Math.random() * n);

/**
 * One MODEL_FEATHER SubType 0 or 1 (ZzzEffect.cpp:4692-4733, :8350-8398; drawn ZzzObject.cpp:1798-1804): up to
 * 40 cm off, scale 0.6 +-30%, 20-39 ticks, alpha 0.6-0.78; where it is made it tumbles -5..4 degrees a tick on
 * each axis while its light and alpha keep 0.97 a tick (SubType 1 its size 0.99 too).
 */
function feather(scene: Scene, hand: Vector3, sub: 0 | 1): void {
  at.set(hand.x + ((rand(20) - 10) * 4) / 100, hand.y + ((rand(20) - 10) * 4) / 100, hand.z + ((rand(20) - 10) * 4) / 100);
  const scale = 0.6 + (rand(20) - 10) * 0.6 * 0.03;
  const born = fxNow();
  const start = [rand(360) * DEG, rand(360) * DEG, rand(360) * DEG];
  const turn = [(rand(10) - 5) * DEG, (rand(10) - 5) * DEG, (rand(10) - 5) * DEG];
  effects.spawn('model', scene, at, {
    model: MODEL.feather,
    seconds: (30 + rand(20) - 10) * TICK,
    scale,
    scaleAt: sub === 1 ? t => scale * 0.99 ** (t / TICK) : undefined,
    colour: [GREY[0], GREY[1], GREY[2]],
    alpha: 0.6 + rand(10) * 0.02,
    decay: 0.97,
    intensity: t => 0.97 ** (t / TICK),
    fadeTail: 0,
    rotate: out => {
      const k = (fxNow() - born) / TICK;
      return out.set(start[0] + turn[0] * k, start[1] + turn[1] * k, start[2] + turn[2] * k);
    },
  });
}

/**
 * While the wearer's key is 4.5-5 and `rand_fps_check(1)` passes, `rand() % 3` rounds of four feathers (SubType
 * 0, 1, 0, 1) at vZX03 and vZx04 (ZzzCharacter.cpp:7985-7995). Both points are never set; the hand's is used.
 */
const feathers: HeldEmitter = {
  bone: -1,
  emit(scene, hand, wearer, dt) {
    if (wearer.frame < 4.5 || wearer.frame > 5 || Math.random() >= dt * 25) return;
    const rounds = rand(3);
    for (let i = 0; i < rounds; i++) for (const sub of SUBS) feather(scene, hand, sub);
  },
};

// MODEL_STINGER_BOW carried (ZzzCharacter.cpp:7970-7997): a grey flare on every bone 0-43 but 1, and grey
// feathers at the shot; the original reads two points it never sets for them, so they start at the hand.
export default defineItemLook({
  items: [[4, 23]],
  emit: [feathers],
  held: Array.from({ length: 44 }, (_, i) => i)
    .filter(bone => bone !== 1)
    .map(bone => ({ texture: 'flare01', bone, scale: 0.8, light: [0.2, 0.25, 0.3] })),
});
