import { COMBAT_BUS, playSfx } from '@/controllers/sound';
import { DEG, deg, randInt } from '../_shared';
import { DUST, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Matrix, Quaternion, Vector3 } from '@/controllers/render/babylon/exports';
import { delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '../../objects/enum';
import { SkillContext, Step, TICK, baseSkill, cm, currentSkill, facing, ring, ticks } from '@/controllers/skills/visuals';
import { type Sounds } from '@/controllers/sound/recipes';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { playCombat } from '@/controllers/sound/combat';

import { A } from '@/controllers/combat/recipes';

// ---- dl1 steps -------------------------------------------------------------------

/** The Dark Lord's strike clips; key 3 releases Force and Fire Burst (ZzzCharacter.cpp:2865-2883). */
const STRIKE_CLIPS: ReadonlySet<number> = new Set([PlayerAction.PLAYER_ATTACK_STRIKE, PlayerAction.PLAYER_ATTACK_RIDE_STRIKE, PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_STRIKE]);
const STRIKE_KEY = 3;
/** AttackTime starts at 1 and fires at 15 (ZzzCharacter.cpp:4132-4140): 14 ticks at most. */
export const STRIKE_MAX_TICKS = 14;
/** Moves an effect has made when drawn `t` seconds after its spawn: the first runs in the frame it is created. */
export const movesAt = (t: number): number => 1 + t / TICK;
/** The caster's `Angle[2]` in degrees, for model.ts `angle`. */
export const yawDegrees = (c: SkillContext): number => (entityYaw(c.caster) * 180) / Math.PI;

/**
 * `step` once the caster's strike clip passes key 3, or 14 ticks after the packet, whichever comes first,
 * with `sound` as it fires. The original needs a live target for any of it (ZzzCharacter.cpp:4811-4839).
 */
export const strikeKey = (step: Step, sound: Sounds): Step => (at, c) => {
  if (!c.target?.transform) return;
  const p = at.clone();
  let waited = 0;
  const poll = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    const struck = !!m && STRIKE_CLIPS.has(m.CurrentAction) && m.actionFrame() >= STRIKE_KEY;
    if (!struck && waited++ < STRIKE_MAX_TICKS) {
      delay(TICK, poll);
      return;
    }
    playCombat(sound, c.caster.transform!.pos);
    step(p, c);
  };
  poll();
};

/** A MODEL_WAVES scale after `n` moves: `Scale += Gravity`, `Gravity += dg`, capped (MoveHandlers.cpp:5277-5290). */
const wavesScale = (s0: number, dg: number, cap: number, n: number): number => Math.min(cap, s0 + 0.01 * n + (dg * n * (n - 1)) / 2);

/** Force's rings, streaks and lance sit 130 cm over the caster's feet (MODEL_WAVES +50 +80, PIERCING2 +130). */
const FORCE_HEIGHT = cm(130);
/** BITMAP_PIERCING sub0 lays 30 tails 20 cm apart straight ahead on its first tick (ZzzEffectJoint.cpp:6492-6505). */
const PIERCING_LENGTH = cm(29 * 20);

/** One BITMAP_PIERCING sub0: a static Piercing.jpg streak from `p` along `f`, width 70-109 cm, x1/1.4 a tick, LT 10. */
function piercingStreak(p: Vector3, f: Vector3, c: SkillContext): void {
  const far = new Vector3(p.x + f.x * PIERCING_LENGTH, p.y, p.z + f.z * PIERCING_LENGTH);
  // U runs from the caster (0) to the far end (1), the original's (NumTails - j) / (MaxTails - 1).
  effects.spawn('joint', c.scene, far, {
    to: p.clone(),
    jitter: 0,
    segments: 2,
    width: cm(70 + randInt(40)),
    colour: Math.random() < 0.5 ? [1, 0.8, 0.6] : RGBS.white,
    texture: TEX.pierce,
    seconds: ticks(10),
    intensity: t => Math.pow(1.4, -movesAt(t)),
  });
}

/**
 * Force / Force Wave at the strike (ZzzCharacter.cpp:5056-5063), all at the caster: 2x MODEL_WAVES sub1
 * (ZzzEffect.cpp:3207-3222), each laying 2 BITMAP_PIERCING streaks before its ±50 cm jitter, then
 * MODEL_PIERCING2 (:3248-3264) easing 1.2 m forward and dropping a MODEL_WAVES sub2 a tick for 5 ticks
 * (MoveHandlers.cpp:5360-5396). Vertical rings facing the heading, depth-tested, near white.
 */
export const force: Step = (_at, c) => forceParts(c, 1.5);

/** Direction[1] from -60 by +12 a tick to 0: the lance is 48, 36, 24, 12 cm on after `n` moves, then held 1.2 m out. */
const forceReach = (n: number): number => (n >= 4 ? cm(120) : cm(60 * n - 6 * n * (n + 1)));

/** Force's parts; `ringFade` is the sub1 rings' per-tick BlendMeshLight divisor (1.5 in the original). */
function forceParts(c: SkillContext, ringFade: number): void {
  const yaw = yawDegrees(c);
  const f = facing(c);
  const p = entityPos(c.caster, FORCE_HEIGHT, new Vector3());
  for (let i = 0; i < 2; i++) {
    piercingStreak(p, f, c);
    piercingStreak(p, f, c);
    const s0 = 0.1 + randInt(50) / 100;
    const q = new Vector3(p.x + cm(randInt(100) - 50), p.y, p.z + cm(randInt(100) - 50));
    effects.spawn('model', c.scene, q, {
      model: MODEL.waves,
      seconds: ticks(14),
      angle: [90, 0, yaw],
      scaleAt: t => wavesScale(s0, 0.07, 2, movesAt(t)),
      intensity: t => Math.pow(ringFade, -movesAt(t)),
      fadeTail: 0,
    });
  }
  const t0 = fxNow();
  effects.spawn('model', c.scene, p, {
    model: MODEL.piercing2,
    seconds: ticks(9),
    scale: 2,
    angle: [0, 0, yaw],
    follow: out => {
      const d = forceReach(movesAt(fxNow() - t0));
      return out.set(p.x + f.x * d, p.y, p.z + f.z * d);
    },
    intensity: t => Math.pow(1.6, -Math.min(5, movesAt(t))),
    fadeTail: 0,
  });
  // While LT > 5 the lance drops one ring a tick where it stands, Scale 0.05 x LT.
  for (let m = 1; m <= 5; m++) {
    const d = forceReach(m - 1);
    const s0 = 0.05 * (11 - m);
    const ring = new Vector3(p.x + f.x * d, p.y, p.z + f.z * d);
    delay(ticks(m - 1), () =>
      effects.spawn('model', c.scene, ring, {
        model: MODEL.waves,
        seconds: ticks(14),
        angle: [90, 0, yaw],
        scaleAt: t => wavesScale(s0, 0.01, 1.5, movesAt(t)),
        intensity: t => Math.pow(1.5, -movesAt(t)),
        fadeTail: 0,
      })
    );
  }
}
/** TurnAngle2: `cur` toward `target` by at most `max` degrees, in [0, 360) (ZzzAI.cpp:120-127). */
const turnToward = (cur: number, target: number, max: number): number => {
  let d = (((target % 360) + 360) % 360) - (((cur % 360) + 360) % 360);
  if (d > 180) d -= 360;
  else if (d < -180) d += 360;
  const next = cur + Math.max(-max, Math.min(max, d));
  return ((next % 360) + 360) % 360;
};
/**
 * MoveHumming (ZzzAI.cpp:135-146): `heading` (MU degrees) turned toward `aim` by at most `turn` in yaw,
 * then in pitch; its unit direction written into `dir` (the `Direction (0, -d, 0)` it moves along).
 */
export function hummingDir(heading: [number, number, number], pos: Vector3, aim: Vector3, turn: number, dir: Vector3): Vector3 {
  const dx = aim.x - pos.x;
  const dz = aim.z - pos.z;
  heading[2] = turnToward(heading[2], (Math.atan2(dx, -dz) * 180) / Math.PI, turn);
  heading[0] = turnToward(heading[0], 360 - (Math.atan2(aim.y - pos.y, Math.hypot(dx, dz)) * 180) / Math.PI, turn);
  const pitch = (heading[0] * Math.PI) / 180;
  const yaw = (heading[2] * Math.PI) / 180;
  return dir.set(Math.cos(pitch) * Math.sin(yaw), -Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw));
}

// Enhanced and Ultra: the same parts, with the glow, sparks, ground contact and light the graded frame needs.

/** `strikeKey` for a graded look that lights itself: the row's key is taken at the packet, before another skill is dispatched. */
export const litStrike = (make: (skill: number) => Step, sound: Sounds): Step => (at, c) => strikeKey(make(baseSkill(currentSkill)), sound)(at, c);

/** Force's lavender (the Piercing streaks' violet over the cyan rings) and its sparks' hotter white. */
const FORCE_TINT: RGB = [0.72, 0.78, 1];
const FORCE_SPARK: RGB = [0.88, 0.85, 1];
/** Enhanced rings fade x1/1.65 a tick, not 1.5: at their 2x cap the slower fade reads as a milky wash on the graded frame. */
const FORCE_RING_FADE = 1.65;
/** Sparks thrown along the streaks, 6-13 tiles/s within ±14° of the facing. */
const FORCE_SPARKS = 12;

/**
 * Force on the graded tiers: the original's parts, plus a star flash where the lance leaves, a hot point
 * riding its head, sparks thrown down the streaks, a shock ring and dust at the feet, and the strike light.
 */
export const forceGraded = (skill: number): Step => (_at, c) => {
  forceParts(c, FORCE_RING_FADE);
  const f = facing(c);
  const p = entityPos(c.caster, FORCE_HEIGHT, new Vector3());
  const feet = entityPos(c.caster, 0, new Vector3());
  effects.spawn('sprite', c.scene, p, { texture: TEX.impact, colour: FORCE_TINT, size: 1.7, seconds: ticks(6), growFrom: 0.5, grow: 1.2, fadeTail: 0.75 });
  const t0 = fxNow();
  effects.spawn('sprite', c.scene, p, {
    texture: TEX.flare,
    colour: FORCE_SPARK,
    size: 0.8,
    seconds: ticks(9),
    follow: out => {
      const d = forceReach(movesAt(fxNow() - t0));
      return out.set(p.x + f.x * d, p.y, p.z + f.z * d);
    },
    fadeTail: 0.6,
  });
  for (let i = 0; i < FORCE_SPARKS; i++) {
    const a = (Math.random() - 0.5) * 0.5;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const v = 6 + Math.random() * 7;
    effects.spawn('sprite', c.scene, p, {
      texture: TEX.flare,
      colour: FORCE_SPARK,
      size: 0.1 + Math.random() * 0.08,
      seconds: 0.25 + Math.random() * 0.2,
      spread: 0.15,
      move: [(f.x * cos - f.z * sin) * v, 0.4 + Math.random() * 1.2, (f.z * cos + f.x * sin) * v],
      fadeTail: 0.6,
    });
  }
  effects.spawn('ring', c.scene, feet, { texture: TEX.shockwave, colour: [0.45, 0.45, 0.85], scale: 1.4, growFrom: 1, grow: 3.2, seconds: 0.45, fadeTail: 0.8 });
  effects.spawn('particles', c.scene, feet, { recipe: DUST, count: 5 });
  // The light stands over the middle of the art: the rings round the caster and the streaks 5.8 m ahead.
  lighting.skillStrike(c.scene, skill, { position: { x: p.x + f.x * 1.5, y: p.y, z: p.z + f.z * 1.5 } });
};

/** The caster's local X for an MU yaw in degrees: right-angled to its forward `(sin y, -cos y)`. */
export const sideOf = (yaw: number, out: Vector3): Vector3 => out.set(Math.cos((yaw * Math.PI) / 180), 0, Math.sin((yaw * Math.PI) / 180));
export const forwardOfDeg = (yaw: number, out: Vector3): Vector3 => out.set(Math.sin((yaw * Math.PI) / 180), 0, -Math.cos((yaw * Math.PI) / 180));

/** Head rise per move of a BITMAP_JOINT_FORCE (ZzzEffectJoint.cpp:2992-3006 moves by the old velocity before :6397-6405 adds). */
export function forceHeads(v: number, d: number, d0: number, firstLt: number, moves: number): number[] {
  const out: number[] = [];
  let h = 0;
  for (let k = 0; k < moves; k++) {
    h += v;
    out.push(h);
    v += d;
    d += firstLt - k < firstLt ? 0.5 : d0;
  }
  return out;
}
/** Embers thrown up a pillar as it erupts. */
export const SPLIT_EMBERS: ParticleRecipe = {
  texture: TEX.spark3,
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.16,
  sizeJitter: 0.4,
  life: 0.7,
  lifeJitter: 0.3,
  box: [0.35, 0.1, 0.35],
  dir1: [-0.25, 1, -0.25],
  dir2: [0.25, 1, 0.25],
  power: 4,
  powerJitter: 0.5,
  gravity: -2,
  spin: 4,
  capacity: 256,
};

// ---- dl2 steps -------------------------------------------------------------------

/** A sound where the step lands, timed with the effect that plays it (a move handler's `PlayBuffer`). */
export const sfx =
  (key: Sounds): Step =>
  at => {
    playSfx(key, at, { bus: COMBAT_BUS });
  };

/** `fn(i)` once a tick for `n` ticks on the effects clock, the first now. */
export function everyTick(n: number, fn: (i: number) => void): void {
  let i = 0;
  const tick = (): void => {
    fn(i);
    if (++i < n) delay(TICK, tick);
  };
  tick();
}

/** An `Angle[2]` in MU degrees as a model node's yaw: the conversion mirrors, so the sign flips (common/renderAngles.ts). */
export const muYaw = (deg: number): number => (-deg * Math.PI) / 180;

/** `at` + `AngleMatrix((0, 0, deg))` applied to `(0, r, 0)`, flat - the original's offset on a turned axis. */
export function muRotated(at: Vector3, deg: number, r: number): Vector3 {
  const a = (deg * Math.PI) / 180;
  return new Vector3(at.x - Math.sin(a) * r, at.y, at.z + Math.cos(a) * r);
}

/** Ticks of a `life`-tick effect still to run at progress `p`. */
export const ticksLeft = (p: number, life: number): number => life * (1 - p);

/** `step` once the caster's clip, one of `clips`, reaches key `frame` (an `AnimationFrame` gate); after `fallback` seconds if it never does. */
export const atFrame = (clips: ReadonlySet<number>, frame: number, fallback: number, step: Step): Step => (at, c) => {
  const t0 = fxNow();
  const poll = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    if ((m && clips.has(m.CurrentAction) && m.actionFrame() >= frame) || fxNow() - t0 >= fallback) step(at, c);
    else delay(TICK, poll);
  };
  poll();
};
// Add Critical (64), Removal Buff (72), Chaotic Diseier (238).

/**
 * An MU `o->Angle` in degrees as a model node's `pitch` / `yaw` / `roll`. `AngleMatrix` is
 * Rz.Ry.Rx; the model conversion swaps y and z, which turns it into Ry(-a2).Rz(-a1).Rx(-a0).
 */
export function muAngle(a0: number, a1: number, a2: number): { pitch: number; yaw: number; roll: number } {
  const m = Matrix.RotationX(-a0 * DEG).multiply(Matrix.RotationZ(-a1 * DEG)).multiply(Matrix.RotationY(-a2 * DEG));
  const e = Quaternion.FromRotationMatrix(m).toEulerAngles();
  return { pitch: e.x, yaw: e.y, roll: e.z };
}

/**
 * Dark Lord strikes - Force, Force Wave, Fire Burst, Fire Scream, Space
 * Split, Chaotic Diseier. `Helper >= UNIRIA && <= DARK_HORSE` is one branch
 * (WSclient.cpp:3929-3945).
 */
export const MOUNTED_STRIKE = {
  uniria: A.PLAYER_ATTACK_RIDE_STRIKE,
  dinorant: A.PLAYER_ATTACK_RIDE_STRIKE,
  horse: A.PLAYER_ATTACK_RIDE_STRIKE,
  fenrir: A.PLAYER_FENRIR_ATTACK_DARKLORD_STRIKE,
} as const;
