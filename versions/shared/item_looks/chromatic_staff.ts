import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter, HeldSprite, LookLight } from '@/controllers/item_fx/itemLooks';
import type { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { TICK, fxNow } from '@/controllers/fx/core';

const PINK = [0.8, 0.1, 0.4] as const;
const GOLD = [0.8, 0.8, 0.2] as const;
const circle: LookLight = (ms, _body, out) => {
  const a = Math.abs(Math.sin(ms * 0.0008));
  out.set(0.1 + 0.8 * a, 0.1 * a, 0.1 + 0.4 * a);
};

/** One carried staff's moon: the model, when the staff was last drawn, its wearer's facing. */
type Moon = { handle: { alive: boolean } | null; seen: number; born: number; yaw: number };

/**
 * `CreateEffect(MODEL_MOONHARVEST_MOON, orb, o->Angle, circle light, 2, ..., 0.12)` on every `rand_fps_check(1)`:
 * the chysukmoon model, additive, living one tick, so it is up while the staff is drawn (ZzzEffect.cpp:3884-3888,
 * :8851-8854; ZzzObject.cpp:1339-1342). One model per carried staff, following the orb, instead of one a tick;
 * its light is the circle's pulse, the red channel's curve over the peak colour.
 */
function moon(): HeldEmitter {
  const moons = new WeakMap<Vector3, Moon>();
  return {
    bone: 8,
    emit(scene, at, wearer, _dt, ms) {
      let m = moons.get(at);
      if (!m) {
        m = { handle: null, seen: 0, born: 0, yaw: 0 };
        moons.set(at, m);
      }
      const state = m;
      state.seen = fxNow();
      state.yaw = wearer.yaw;
      if (state.handle?.alive) return;
      state.born = ms;
      state.handle = effects.spawn('model', scene, at, {
        model: 'Effect/chysukmoon.glb',
        scale: 0.12,
        seconds: Infinity,
        fadeTail: 0,
        colour: [0.9, 0.1, 0.5],
        follow: out => out.copyFrom(at),
        rotate: out => out.set(0, -state.yaw, 0),
        intensity: t => (0.1 + 0.8 * Math.abs(Math.sin((state.born + t * 1000) * 0.0008))) / 0.9,
        until: () => fxNow() - state.seen > 2 * TICK,
      });
    },
  };
}

// MODEL_CHROMATIC_STAFF carried (ZzzCharacter.cpp:8221-8251): a big flare, a pulsing magic circle and a
// gold Shiny02 at the orb (bone 8), small ones on the beads (1-7), and the harvest moon on the orb.
export default defineItemLook({
  items: [[5, 33]],
  emit: [moon()],
  held: [
    { texture: 'flare01', bone: 8, scale: 3.5, light: [0.9, 0.1, 0.4] },
    { texture: 'magicGround1', bone: 8, scale: 0.3, light: circle },
    { texture: 'shiny02', bone: 8, scale: 1, light: GOLD },
    ...[1, 2, 3, 4, 5, 6, 7].flatMap((bone): HeldSprite[] => [
      { texture: 'flare01', bone, scale: 0.6, light: PINK },
      { texture: 'magicGround1', bone, scale: 0.12, light: PINK },
      { texture: 'shiny02', bone, scale: 0.3, light: GOLD },
    ]),
  ],
});
