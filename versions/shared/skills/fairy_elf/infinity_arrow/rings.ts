import { MODEL, TEX } from '@/controllers/fx/recipes';
import { bonePos, entityGone, fxNow, TICK, type PointSource, type RGB } from '@/controllers/fx/core';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { cm, facing, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import type { Entity } from '@/ecs/world';

/**
 * Infinity Arrow as the original casts it (WSclient.cpp:4882-4888): MODEL_INFINITY_ARROW sub0 at the
 * caster, which makes the rings (ZzzEffect.cpp:435-457). See ../readme.md.
 */

const DEG = Math.PI / 180;
/** The caster's hand: every ring that tracks him rides `BoneTransform[29]` (MoveHandlers.cpp:131-148). */
const HAND_BONE = 29;
/** MODEL_INFINITY_ARROW1-3 sub0: LT 40, Light 1 x 0.95 a tick at the caster's feet (ZzzEffect.cpp:455-468, MoveHandlers.cpp:151-160). */
const RING_TICKS = 40;
/** MODEL_INFINITY_ARROW4: LT 15, Light (1, 0.5, 0.3) x 0.9 and Scale x 1.2 a tick on the hand (EffectRegistry.cpp:71, EffectBehaviors.cpp:51-68). */
const BURST_TICKS = 15;
const BURST_LIGHT: RGB = [1, 0.5, 0.3];
/** MODEL_INFINITY_ARROW sub1 draws no body; its bones 1-9 but 5 send a BITMAP_FLARE + 1 sub16 joint each tick (ZzzObject.cpp:1598-1608). */
const JOINT_BONES = [1, 2, 3, 4, 6, 7, 8, 9];
/** BITMAP_FLARE + 1 sub16 (ZzzEffectJoint.cpp:2232-2240): LT 35, 8 tails, Velocity 7, Light (1, 0.5, 0.3), Scale 20. */
const JOINT_TICKS = 35;
const JOINT_TAILS = 8;
const JOINT_LIGHT: RGB = [1, 0.5, 0.3];
const JOINT_WIDTH = cm(20);
/** Enough hidden mesh slots for arrowsre01: it draws nothing. */
const HIDDEN = Array.from({ length: 8 }, () => ({ draw: 'hide' as const }));

const hand = (caster: Entity): PointSource => out => bonePos(caster, HAND_BONE, out);

/**
 * The sub16 joint's head (ZzzEffectJoint.cpp:5983-6011): while LifeTime >= 25 it turns -10 deg and rises 2.5 cm a
 * tick; then its Velocity climbs 5 a tick to 30 and MoveHumming turns it that many degrees toward the ring on the
 * hand; it moves Velocity cm along its Angle each tick.
 */
function jointHead(start: Vector3, yaw: number, target: PointSource): PointSource {
  const pos = start.clone();
  const goal = new Vector3();
  const born = fxNow();
  let heading = yaw;
  let pitch = 0;
  let velocity = 7;
  let done = 0;
  const step = (life: number): void => {
    if (life >= 25) {
      heading -= 10 * DEG;
      pos.y += cm(2.5);
    } else {
      velocity = Math.min(30, velocity + 5);
      target(goal);
      const dx = goal.x - pos.x;
      const dz = goal.z - pos.z;
      const want = Math.atan2(dx, dz);
      const wantPitch = Math.atan2(goal.y - pos.y, Math.hypot(dx, dz));
      const turn = velocity * DEG;
      const dYaw = Math.atan2(Math.sin(want - heading), Math.cos(want - heading));
      heading += Math.max(-turn, Math.min(turn, dYaw));
      pitch += Math.max(-turn, Math.min(turn, wantPitch - pitch));
    }
    const run = cm(velocity);
    pos.x += Math.sin(heading) * Math.cos(pitch) * run;
    pos.z += Math.cos(heading) * Math.cos(pitch) * run;
    pos.y += Math.sin(pitch) * run;
  };
  return out => {
    const now = Math.floor((fxNow() - born) / TICK + 1e-6);
    while (done < now && done < JOINT_TICKS) step(JOINT_TICKS - ++done);
    return out.copyFrom(pos);
  };
}

/** The original's `Light *= k` a tick, as a brightness over seconds alive. */
const perTickDecay = (k: number) => (t: number) => k ** Math.floor(t / TICK + 1e-6);

/** `Light *= 1 / 1.2` a tick over the joint's last 10 ticks. */
const jointLight = (t: number) => (1 / 1.2) ** Math.max(0, Math.floor(t / TICK + 1e-6) - (JOINT_TICKS - 10));

function flareJoints(c: SkillContext, at: Vector3): void {
  const caster = c.caster;
  const target = hand(caster);
  const yaw = Math.atan2(facing(c).x, facing(c).z);
  const p = new Vector3();
  let sent = 0;
  effects.spawn('summon', c.scene, at, {
    model: MODEL.infinityArrow[0],
    seconds: ticks(RING_TICKS),
    meshes: HIDDEN,
    yaw: -yaw,
    until: () => entityGone(caster),
    drive: (body, t) => {
      target(body.at);
      const tick = Math.floor(t + 1e-6);
      if (!body.loaded || tick < sent) return;
      sent = tick + 1;
      for (const bone of JOINT_BONES) {
        if (!body.bone(bone, p)) continue;
        effects.spawn('joint', c.scene, p.clone(), {
          head: jointHead(p, yaw, target),
          maxTails: JOINT_TAILS,
          width: JOINT_WIDTH,
          colour: JOINT_LIGHT,
          texture: TEX.flare2,
          seconds: ticks(JOINT_TICKS),
          intensity: jointLight,
        });
      }
    },
  });
}

export const infinityArrowRings: Step = (at, c) => {
  const caster = c.caster;
  const yaw = -Math.atan2(facing(c).x, facing(c).z);
  const feet: PointSource = out => {
    const pos = caster.transform?.pos ?? at;
    return out.set(pos.x, pos.y, pos.z);
  };
  for (let i = 1; i <= 3; i++) {
    effects.spawn('model', c.scene, at, {
      model: MODEL.infinityArrow[i],
      seconds: ticks(RING_TICKS),
      scale: 1,
      yaw,
      follow: feet,
      fadeTail: 0,
      intensity: perTickDecay(0.95),
    });
  }
  effects.spawn('model', c.scene, at, {
    model: MODEL.infinityArrow[4],
    seconds: ticks(BURST_TICKS),
    colour: BURST_LIGHT,
    yaw,
    follow: hand(caster),
    fadeTail: 0,
    scaleAt: t => 1.2 ** Math.floor(t / TICK + 1e-6),
    intensity: perTickDecay(0.9),
  });
  flareJoints(c, at);
};

