import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import type { HeldEmitter, HeldSprite } from '@/controllers/item_fx/itemLooks';
import type { Vector3 } from '@/controllers/render/babylon/exports';
import { TEX, effects, type EffectOptions } from '@/controllers/fx';

/** BITMAP_JOINT_ENERGY SubType 17's light (47's is red), ZzzEffectJoint.cpp:463, :473. */
export const VIOLET = [0.8, 0.2, 1] as const;

/**
 * `CreateJoint(BITMAP_JOINT_ENERGY, p, p, o->Angle, 17 or 47, o, width)` on the frames `rand_fps_check(1)`
 * passes: a ribbon 12 ticks long-lived whose head follows the weapon's point (`o->EyeLeft` / `EyeRight`,
 * ZzzEffectJoint.cpp:254-263, :3086-3117). One options object per carried weapon, reused for each.
 */
export function energyTrail(bone: number, colour: readonly [number, number, number], widthCm: number, offset?: readonly [number, number, number]): HeldEmitter {
  const trails = new WeakMap<Vector3, EffectOptions<'joint'>>();
  return {
    bone,
    offset,
    emit(scene, at, _wearer, dt) {
      if (Math.random() >= dt * 25) return;
      let opts = trails.get(at);
      if (!opts) {
        // The original never sets MaxTails for 17 and 47 (leftover memory): 8, as its eye-following trails (:292-325).
        opts = { head: out => out.copyFrom(at), maxTails: 8, width: widthCm / 100, colour: [...colour], seconds: 12 / 25, texture: TEX.jointEnergy, fadeTail: 0 };
        trails.set(at, opts);
      }
      effects.spawn('joint', scene, at, opts);
    },
  };
}

/** The frame's `rand() % 15 / 30 + 0.5`, shared by bones 8 and 9. */
const roll = { ms: -1, size: 0 };
const size = (ms: number) => {
  if (roll.ms !== ms) {
    roll.ms = ms;
    roll.size = Math.floor(Math.random() * 15) / 30 + 0.5;
  }
  return roll.size;
};

const gem = (bone: number): HeldSprite[] => [
  { texture: 'flareBlue', bone, scale: 0.4, light: (_ms, body, out) => out.copyFrom(body) },
  { texture: 'shiny05', bone, scale: bone < 10 ? size : 0.4, light: [0.1, 0.4, 0.9] },
];

// MODEL_IMPERIAL_SWORD (ZzzObject.cpp:7120-7127): the body lit, mesh 2 again additive, then 1 as the
// blend mesh at a pulsing BlendMeshLight.
// Carried (ZzzCharacter.cpp:7796-7839): a blue flare in the wearer's light and shiny05 on bones 8-11, blue
// light marks on 2-7, and a violet energy trail off bone 8.
export default defineItemLook({
  items: [[0, 28]],
  emit: [energyTrail(8, VIOLET, 25)],
  body: {
    passes: [
      { mesh: 2, kind: 'add' },
      { mesh: 1, kind: 'add', gain: ms => Math.max(0, Math.sin(ms * 0.001) * 0.6 + 0.4) },
    ],
  },
  held: [
    ...[8, 9, 10, 11].flatMap(gem),
    ...[1, 0.8, 0.6, 0.4, 0.2, 0.1].map((scale, i): HeldSprite => ({ texture: 'lightmarks', bone: i + 2, scale, light: [0, 0.3, 0.7] })),
  ],
});
