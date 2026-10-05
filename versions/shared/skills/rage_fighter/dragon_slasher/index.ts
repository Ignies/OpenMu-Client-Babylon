import { defineSkill } from '@/controllers/skills/define';
import { TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { bonePos, entityGone, entityPos, entityYaw } from '@/controllers/fx/core';
import type { TailStrip } from '@/controllers/fx/ticked';
import { DEG, deg, eachClipTick, multiShotVolley } from '../../_shared';
import { clipSpeed, eachMove } from '../_shared';
import { IMPACT_HEIGHT, cm, steelHit, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { playCombat } from '@/controllers/sound';

import { A } from '@/controllers/combat/recipes';

/** MODEL_DRAGON_KICK_DUMMY's LifeTime (ZzzEffect.cpp:6131-6139): it also dies when the caster leaves DRAGONKICK. */
const DUMMY_TICKS = 200;

/**
 * dragon_kick_dummy.bmd's bone 0, key by key (one action of 19, LockPositions): its height in cm and its turn about z as the
 * quaternion's (z, w). Bones 1 and 2 hang 47.24 and 83.41 cm along its -x, so bone 2 swings 130.65 cm out.
 */
const DUMMY_KEYS: readonly (readonly [number, number, number])[] = [
  [7.9604, 0, 1], [12.7616, -0.0233, 0.99973], [25.688, -0.08594, 0.9963], [44.5235, -0.17654, 0.98429], [67.0523, -0.28291, 0.95915],
  [91.0583, -0.3925, 0.91975], [114.3257, -0.49365, 0.86966], [134.6385, -0.57686, 0.81684], [134.6385, 0.06498, 0.99789],
  [134.6385, 0.67792, 0.73514], [134.6385, 0.98937, 0.14545], [134.6385, -0.99647, 0.08391], [134.6385, -0.95111, 0.30886],
  [134.6385, -0.85566, 0.51754], [134.6385, -0.8103, 0.58601], [134.6385, -0.75948, 0.65053], [134.6385, -0.70353, 0.71066],
  [134.6385, -0.5086, 0.861], [134.6385, -0.28285, 0.95916],
];
const DUMMY_ARM = cm(130.6532);

/** The dummy's AnimationFrame and PriorAnimationFrame as PlayAnimation steps them, wrapping a LockPositions clip at its last key (ZzzBMD.cpp:738-800). */
interface Dummy {
  frame: number;
  prior: number;
}
function stepDummy(d: Dummy, speed: number): void {
  const before = Math.floor(d.frame);
  d.frame += speed;
  if (Math.floor(d.frame) !== before) d.prior = before;
  const last = DUMMY_KEYS.length - 1;
  if (d.frame >= last) d.frame = (Math.floor(d.frame) % last) + d.frame - Math.floor(d.frame);
}

/**
 * The dummy's bone 2 at `frame` as an offset from its feet in tiles (BMD::Animation, ZzzBMD.cpp:134-281): its prior key blended
 * into the frame's key by the frame's fraction, the turn by NLERP the short way, the height straight, all turned to `yaw`.
 */
function dummyBone2(frame: number, prior: number, yaw: number, out: Vector3): Vector3 {
  const whole = Math.floor(frame);
  const s = frame - whole;
  const [z1, a1, b1] = DUMMY_KEYS[prior < DUMMY_KEYS.length ? prior : 0];
  const [z2, a2, b2] = DUMMY_KEYS[whole < DUMMY_KEYS.length ? whole : 0];
  const t = a1 * a2 + b1 * b2 < 0 ? -s : s;
  const turn = 2 * Math.atan2((1 - s) * a1 + t * a2, (1 - s) * b1 + t * b2) + yaw * DEG;
  return out.set(-DUMMY_ARM * Math.cos(turn), cm(z1 * (1 - s) + z2 * s), -DUMMY_ARM * Math.sin(turn));
}

/** A BITMAP_GROUND_WIND joint: its strip, the 0.1 frames it runs ahead of the dummy (SubType x AlphaTarget), its moves and yaw. */
interface Wind {
  strip: TailStrip;
  ahead: number;
  moves: number;
  yaw: number;
}
/** Its tails lie Scale 150 / 2 cm either side, on the flat face (ZzzEffectJoint.cpp:2731-2740). */
const WIND_HALF = cm(150 / 2);
const WIND_STRIP = { texture: TEX.groundWind, colour: [0.7, 0.7, 1] as const, maxTails: 8, faces: 'flat' as const, maxSegment: cm(60), batch: 16 };
const windAt = new Vector3();

/**
 * The ground wind (MoveHandlers.cpp:9839-9860): on each tick the caster's DRAGONKICK frame is between 4 and 5, the dummy makes
 * Velocity x 10 joints (8 at its 0.8 a tick) on the caster's bone 1 at frames stepping over the tick: the dummy has no bones of
 * its own, so TransformByObjectBone reads the ones just animated, the caster's. Each joint then rides the dummy's bone 2 at its
 * frame + 0.1 x SubType, 20 cm up, for 10 moves at Light (0.7, 0.7, 1) x0.7 a move, and goes with the dummy
 * (ZzzEffectJoint.cpp:2731-2740, :6900-6915). Returns the caster's clip tick, which makes the joints.
 */
function groundWind(c: SkillContext, over: () => boolean): (frame: number) => void {
  const speed = 2 * clipSpeed(c, A.PLAYER_SKILL_DRAGONKICK);
  const dummy: Dummy = { frame: 0, prior: 0 };
  const made: Vector3[] = [];
  const winds: Wind[] = [];
  const feet = entityPos(c.caster, 0, new Vector3());
  const last = bonePos(c.caster, 1, new Vector3());
  const move = (w: Wind): void => {
    w.moves++;
    w.strip.light = 0.7 ** w.moves;
    dummyBone2(dummy.frame + w.ahead, dummy.prior, deg(entityYaw(c.caster)), windAt).addInPlace(feet);
    w.strip.push(windAt.x, windAt.y + cm(20), windAt.z, WIND_HALF, w.yaw, 0);
  };
  // The dummy moves before the joints, the ones it made this tick too (MoveEffects, then MoveJoints).
  eachMove(c.scene, feet, (_m, fx) => {
    stepDummy(dummy, speed);
    if (over() || entityGone(c.caster)) return false;
    entityPos(c.caster, 0, feet);
    for (let i = winds.length - 1; i >= 0; i--) {
      if (winds[i].moves < 10) move(winds[i]);
      else fx.drop(winds.splice(i, 1)[0].strip);
    }
    for (let i = 0; i < made.length; i++) {
      const w: Wind = { strip: fx.strip(WIND_STRIP), ahead: i * 0.1, moves: 0, yaw: entityYaw(c.caster) };
      w.strip.push(made[i].x, made[i].y, made[i].z, WIND_HALF, w.yaw, 0);
      winds.push(w);
      move(w);
    }
    made.length = 0;
    return true;
  });
  return frame => {
    const now = bonePos(c.caster, 1, new Vector3());
    const count = speed * 10;
    if (frame > 4 && frame < 5) for (let i = 0; i < count; i++) made.push(Vector3.Lerp(last, now, i / count));
    last.copyFrom(now);
  };
}

/**
 * At the packet the MULTI_SHOT1/2/3 volley and the dummy, which has no mesh (MonkSystem.cpp:1215-1260). Each tick the dummy
 * lives (MoveHandlers.cpp:9826-9915): the ground wind between keys 4 and 5, past key 5 the burst on the target, past key 8
 * Rage_Dragonkick_Att (LifeTime = 150 then == 150, so every tick). Leaving the clip ends it all.
 */
const dragonKick: Step = (at, c) => {
  let over = false;
  multiShotVolley(at, c);
  const wind = groundWind(c, () => over);
  const target = c.target;
  eachClipTick(c, A.PLAYER_SKILL_DRAGONKICK, DUMMY_TICKS, frame => {
    wind(frame);
    // m_sTargetIndex < 0 returns before the burst and the sound.
    if (!target || entityGone(target)) return;
    if (frame > 5) steelHit(entityPos(target, IMPACT_HEIGHT, new Vector3()), c);
    const p = c.caster.transform?.pos;
    if (frame > 8 && p) playCombat('Sound/Ragefighter/Rage_Dragonkick_Att', { x: p.x, z: p.z });
  }, () => {
    over = true;
  });
};

export default defineSkill({
  id: 265,
  name: "Dragon Slasher",
  // 265 Dragon Slasher (AT_SKILL_DRAGON_KICK): the volley, the ground wind and the per-tick burst; see dragonKick.
  visual: { cast: dragonKick },
  sound: 'Sound/Ragefighter/Rage_Dragonkick', // Dragon Slasher
  delayMs: 3000, // Dragon Slasher
  clip: { ground: A.PLAYER_SKILL_DRAGONKICK }, // Dragon Slasher
  stepIn: 'midClip',
});
