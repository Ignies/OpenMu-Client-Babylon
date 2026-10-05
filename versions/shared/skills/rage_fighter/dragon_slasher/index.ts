import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { bonePos, entityGone, entityPos, entityYaw, fxNow, type RGB } from '@/controllers/fx/core';
import type { TailStrip, TickedFx } from '@/controllers/fx/ticked';
import type { Entity } from '@/ecs/world';
import { DEG, deg, eachClipTick, multiShotVolleyAt, randInt } from '../../_shared';
import { angleToward, clipSpeed, eachMove, fallSpark } from '../_shared';
import { cm, type SkillContext, type Step } from '@/controllers/skills/visuals';
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

/** RageCreateEffect's SOUND_RAGESKILL_DRAGONKICK, with a target only (MonkSystem.cpp:1259). */
const KICK_SOUND = 'Sound/Ragefighter/Rage_Dragonkick';

/** The dummy's Light, which its particles on the target take (MonkSystem.cpp:1222-1223). */
const KICK_LIGHT: RGB = [0.7, 0.7, 1];

/** The particles of a burst, each with its own move rule: BITMAP_ENERGY sub7, LIGHTNING_MEGA1 sub0, SPARK+1 sub3 and sub8, SPARK sub13. */
const enum Kind {
  Energy,
  Mega,
  Spark3,
  Spark8,
  Spark13,
}

/** One particle of a burst: where it is (tiles), its Scale, its turn (degrees), its moves, and a SPARK sub13's flight. */
interface Mote {
  kind: Kind;
  x: number;
  y: number;
  z: number;
  scale: number;
  roll: number;
  moves: number;
  vx: number;
  vz: number;
  gravity: number;
  life: number;
}

/** Spent particles, reused for the next burst. */
const spentMotes: Mote[] = [];
function mote(kind: Kind, x: number, y: number, z: number, scale: number, roll: number): Mote {
  const m = spentMotes.pop() ?? { kind, x, y, z, scale, roll, moves: 0, vx: 0, vz: 0, gravity: 0, life: 0 };
  m.kind = kind;
  m.x = x;
  m.y = y;
  m.z = z;
  m.scale = scale;
  m.roll = roll;
  m.moves = 0;
  return m;
}
const burstAt = new Vector3();

/**
 * Each tick past DRAGONKICK key 5, twice: from 30 cm over the target, four times a BITMAP_ENERGY sub7 (Scale fScale x 0.6-1.3), a
 * LIGHTNING_MEGA1 sub0 (fScale x 0.9), a SPARK+1 sub3 and a sub8 (1 +- 1 % with WorldTime), every other time a SPARK sub13, and a
 * step aside; fScale is (0.5-0.89) x 1.5 x 1.8 (MoveHandlers.cpp:9866-9895, ZzzEffectParticle.cpp:723-753, :1826-1843, :2016-2061).
 */
function burst(target: Entity, motes: Mote[]): void {
  const base = entityPos(target, 0, burstAt);
  for (let j = 0; j < 2; j++) {
    let x = base.x;
    let y = base.y + cm(30);
    let z = base.z;
    const fScale = (randInt(40) + 50) * 0.01 * 1.5 * 1.8;
    const sparkScale = 1 + Math.sin(fxNow() * 2) * 0.2 * 0.05;
    for (let i = 0; i < 4; i++) {
      motes.push(mote(Kind.Energy, x, y, z, fScale * (randInt(8) + 6) * 0.1, randInt(360)));
      motes.push(mote(Kind.Mega, x, y, z, fScale * 0.9, randInt(360)));
      motes.push(mote(Kind.Spark3, x, y, z, sparkScale, 0));
      motes.push(mote(Kind.Spark8, x, y, z, sparkScale, 0));
      if (i % 2) {
        const s = mote(Kind.Spark13, x, y, z, (randInt(4) + 4) * 0.1 * 1.6, 0);
        s.life = randInt(16) + 24;
        const turn = randInt(360) * DEG;
        s.gravity = randInt(16) + 6;
        // (0, v, 0) turned by Angle[2]: MU (-v sin, v cos).
        const v = cm((randInt(20) + 20) * 0.1 * 1.5);
        s.vx = -v * Math.sin(turn);
        s.vz = v * Math.cos(turn);
        motes.push(s);
        x += cm(randInt(40) + 20);
        z += cm(randInt(30) + 10);
        y += cm(randInt(30) + 25);
      } else {
        x -= cm(randInt(20) + 10);
        z += cm(randInt(30) - 10);
        y += cm(randInt(30) + 30);
      }
    }
  }
}

/** One move of a particle, drawn if it lives: false once it is gone. */
function moveMote(m: Mote, fx: TickedFx): boolean {
  m.moves++;
  switch (m.kind) {
    // LifeTime 5, Rotation + 20 and Light x0.97 a move; Thunder01 64 px (ZzzEffectParticle.cpp:4939-4985).
    case Kind.Energy:
      if (m.moves > 4) return false;
      m.roll += 20;
      fx.sprite(TEX.thunder, KICK_LIGHT, m.x, m.y, m.z, cm(64 * m.scale), cm(64 * m.scale), m.roll * DEG, 0.97 ** m.moves);
      return true;
    // LifeTime 5, Alpha - 0.15 a move over its Light; lighting_mega01 128 px (:6071-6091).
    case Kind.Mega:
      if (m.moves > 4) return false;
      fx.sprite(TEX.lightningMega1, KICK_LIGHT, m.x, m.y, m.z, cm(128 * m.scale), cm(128 * m.scale), m.roll * DEG, 1 - 0.15 * m.moves);
      return true;
    // LifeTime 5, Scale x0.8 a move; Spark03 32 px (:2145-2147, :6646-6648).
    case Kind.Spark3:
      if (m.moves > 4) return false;
      m.scale *= 0.8;
      break;
    // Scale - 0.5 a move, gone under 0.2 (:6683-6688).
    case Kind.Spark8:
      m.scale -= 0.5;
      if (m.scale < 0.2) return false;
      break;
    // Falls and bounces, white at LifeTime / 16 (fallSpark).
    default: {
      const light = fallSpark(m);
      if (light < 0) return false;
      fx.sprite(TEX.spark3, RGBS.white, m.x, m.y, m.z, cm(32 * m.scale), cm(32 * m.scale), 0, Math.min(1, light));
      return true;
    }
  }
  fx.sprite(TEX.spark3, KICK_LIGHT, m.x, m.y, m.z, cm(32 * m.scale), cm(32 * m.scale), 0);
  return true;
}

/**
 * At the packet the dummy, which has no mesh, and with a target the MULTI_SHOT1/2/3 volley turned to it and Rage_Dragonkick:
 * RageCreateEffect returns before both without one (MonkSystem.cpp:1215-1260). The hero's sound went at his click (his
 * RageCreateEffect runs at the cast, SkillCast.cpp:866-879; the echo makes none for him, WSclient.cpp:5115-5121). Each tick
 * the dummy lives (MoveHandlers.cpp:9826-9915): the ground wind between keys 4 and 5, past key 5 the burst on the target, past
 * key 8 Rage_Dragonkick_Att (LifeTime = 150 then == 150, so every tick). Leaving the clip ends it all but the particles out.
 */
const dragonKick: Step = (_at, c) => {
  let over = false;
  const target = c.target?.transform ? c.target : null;
  const p = c.caster.transform?.pos;
  if (target) {
    multiShotVolleyAt(c, angleToward(c, target));
    if (p && !c.caster.localPlayer) playCombat(KICK_SOUND, { x: p.x, z: p.z });
  }
  const wind = groundWind(c, () => over);
  const motes: Mote[] = [];
  // Particles move in the frame they are made, after the dummy (MoveEffects, then MoveParticles).
  eachMove(c.scene, entityPos(c.caster, 0, new Vector3()), (_m, fx) => {
    let n = 0;
    for (const m of motes) {
      if (moveMote(m, fx)) motes[n++] = m;
      else spentMotes.push(m);
    }
    motes.length = n;
    return !over || n > 0;
  });
  eachClipTick(c, A.PLAYER_SKILL_DRAGONKICK, DUMMY_TICKS, frame => {
    wind(frame);
    // m_sTargetIndex < 0 returns before the burst and the sound.
    if (!target || entityGone(target)) return;
    if (frame > 5) burst(target, motes);
    if (frame > 8 && p) playCombat('Sound/Ragefighter/Rage_Dragonkick_Att', { x: p.x, z: p.z });
  }, () => {
    over = true;
  });
};

export default defineSkill({
  id: 265,
  name: "Dragon Slasher",
  // 265 Dragon Slasher (AT_SKILL_DRAGON_KICK): the volley, the ground wind and the per-tick burst; see dragonKick.
  // Rage_Dragonkick is the effect's, with a target only: the hero's click plays it, everyone else's effect.
  visual: { cast: dragonKick },
  targetSound: KICK_SOUND,
  delayMs: 3000, // Dragon Slasher
  clip: { ground: A.PLAYER_SKILL_DRAGONKICK }, // Dragon Slasher
  stepIn: 'midClip',
});
