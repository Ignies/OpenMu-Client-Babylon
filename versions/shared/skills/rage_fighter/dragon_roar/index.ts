import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { TICK, bonePos, entityGone, entityPos, entityYaw, fxNow, type RGB } from '@/controllers/fx/core';
import type { TailStrip, TickedFx } from '@/controllers/fx/ticked';
import { lighting } from '@/controllers/lighting';
import { cm, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { DEG, deg, groundY, movesAt, randInt } from '../../_shared';
import { clipSpeed, eachMove, fallSpark, shockGround, type FallingSpark } from '../_shared';

import { A } from '@/controllers/combat/recipes';

/** BITMAP_LAVA's LifeTime (ZzzEffect.cpp:6141-6147); it dies once the caster leaves DRAGONLORE. */
const LAVA_TICKS = 999;

/** A flame of the fire column (firehik01-03) or a SPARK sub12 (Spark02) the column or the dragon throws; a flame's fields, then a spark's. */
interface Ember extends FallingSpark {
  texture: string;
  scale: number;
  roll: number;
  alpha: number;
  light: number;
  rise: number;
  fadeAt: number;
  shrink: number;
  /** A spark's Light: its maker's. */
  tint: RGB;
}

/**
 * The column's flames: FIRE_HIK1 sub0 and sub5 (LifeTime 27-31, fading under 15, Scale less 0.05-0.07 a move), FIRE_CURSEDLICH
 * sub4 (12-16, 10, 0.06-0.08) and FIRE_HIK3 sub0 (17-21, 10, 0.07-0.09) (ZzzEffectParticle.cpp:282-330, :1845-1945).
 */
const FLAMES = [
  { texture: TEX.fireHik1, life: 27, fadeAt: 15, shrink: 5 },
  { texture: TEX.fireCursedLich, life: 12, fadeAt: 10, shrink: 6 },
  { texture: TEX.fireHik3, life: 17, fadeAt: 10, shrink: 7 },
] as const;

/** Spent embers, reused for the next tick's. */
const spent: Ember[] = [];
function ember(texture: string, x: number, y: number, z: number): Ember {
  const e = spent.pop() ?? { texture, x, y, z, vx: 0, vz: 0, gravity: 0, life: 0, scale: 0, roll: 0, alpha: 0, light: 0, rise: 0, fadeAt: 0, shrink: 0, tint: RGBS.white };
  e.texture = texture;
  e.x = x;
  e.y = y;
  e.z = z;
  return e;
}

/** A flame `kind` of `scale`, Rotation and a rise of 6.4-8.7 cm a move rolled, in `light` (its TurningForce). */
function flame(kind: (typeof FLAMES)[number], x: number, y: number, z: number, scale: number, light: number): Ember {
  const f = ember(kind.texture, x, y, z);
  f.life = randInt(5) + kind.life;
  f.scale = (randInt(72) + 72) * 0.01 * scale;
  f.roll = randInt(360);
  f.rise = (randInt(24) + 64) * 0.1;
  f.alpha = 0;
  f.light = light;
  f.fadeAt = kind.fadeAt;
  f.shrink = kind.shrink;
  f.gravity = -1;
  return f;
}

/** A SPARK sub12: Scale 1.5 + 0.4-0.7, LifeTime 24-39, Gravity 6-21, 2-3.9 cm a move along a random yaw (ZzzEffectParticle.cpp:2087-2096). */
function spark(x: number, y: number, z: number, tint: RGB = RGBS.white): Ember {
  const s = ember(TEX.spark2, x, y, z);
  s.scale = 1.5 + (randInt(4) + 4) * 0.1;
  s.life = randInt(16) + 24;
  const turn = randInt(360) * DEG;
  s.gravity = randInt(16) + 6;
  // (0, v, 0) turned by Angle[2]: MU (-v sin, v cos).
  const v = cm((randInt(20) + 20) * 0.1);
  s.vx = -v * Math.sin(turn);
  s.vz = v * Math.cos(turn);
  s.rise = 0;
  s.tint = tint;
  return s;
}

/**
 * One move of an ember, drawn if it lives: false once it is gone. A flame's Alpha comes in 0.2-0.3 a move to 1 and goes out 0.2 a
 * move under its fade LifeTime (gone under 0.1), its Scale shrinks (gone at 0), and it climbs and turns 3 degrees a move
 * (ZzzEffectParticle.cpp:4339-4360, :6092-6121, :6290-6345); a spark falls (fallSpark).
 */
function moveEmber(e: Ember, fx: TickedFx): boolean {
  if (e.texture === TEX.spark2) {
    const light = fallSpark(e);
    if (light < 0) return false;
    fx.sprite(e.texture, e.tint, e.x, e.y, e.z, cm(4 * e.scale), cm(4 * e.scale), 0, Math.min(1, light));
    return true;
  }
  if (--e.life <= 0) return false;
  if (e.life < e.fadeAt) e.alpha -= 0.2;
  else if (e.alpha < 1) e.alpha += (randInt(2) + 2) * 0.1;
  else e.alpha = 1;
  if (e.alpha < 0.1 || e.scale <= 0) return false;
  e.scale -= (randInt(3) + e.shrink) * 0.01;
  e.y += cm(e.rise);
  e.roll += 3;
  if (e.scale > 0) fx.sprite(e.texture, RGBS.white, e.x, e.y, e.z, cm(64 * e.scale), cm(64 * e.scale), e.roll * DEG, Math.min(1, e.alpha * e.light));
  return true;
}

/**
 * The lava's fire each tick past key 5 (MoveHandlers.cpp:9969-10014): fScale 1.8-2.2; a flame, one of the three, (80 - LifeTime) x 7 cm
 * over the lava; and four steps of up to 50 cm about it, turned by (0-89, 0, 45 x i) and laid back on its height, each with a
 * FIRE_HIK1 sub5 in half the Light and a SPARK sub12 from 250 cm above sea level.
 */
function fireColumn(at: Vector3, lifeTime: number, embers: Ember[]): void {
  const fScale = (randInt(5) + 18) * 0.1;
  const y = at.y + cm((80 - lifeTime) * 7);
  embers.push(flame(FLAMES[randInt(3)], at.x, y, at.z, fScale, 1));
  let x = at.x;
  let z = at.z;
  for (let i = 1; i < 8; i += 2) {
    const dx = randInt(100) - 50;
    const dy = (randInt(100) - 50) * Math.cos(randInt(90) * DEG);
    const turn = 45 * i * DEG;
    x += cm(dx * Math.cos(turn) - dy * Math.sin(turn));
    z += cm(dx * Math.sin(turn) + dy * Math.cos(turn));
    embers.push(flame(FLAMES[0], x, y, z, fScale, 0.5));
    embers.push(spark(x, cm(250), z));
  }
}

/**
 * MODEL_SHOCKWAVE01 sub1 on the caster at its Angle, Light (1, 0.12, 0), Scale 1 (MoveHandlers.cpp:9954-9959): it lives
 * 5 / PlaySpeed ticks (ZzzEffect.cpp:5884-5888); each move Scale x1.24, x1.19 of its height above sea level and Light x0.45, zeroed
 * under 0.001 (MoveHandlers.cpp:9383-9395); drawn bright once at Light x 5 with Damage2 (ZzzObject.cpp:2462-2467).
 */
function roarWave(c: SkillContext): void {
  const feet = entityPos(c.caster, 0, new Vector3());
  const t0 = fxNow();
  effects.spawn('model', c.scene, feet.clone(), {
    model: MODEL.shockwave,
    seconds: ticks(Math.ceil(5 / clipSpeed(c, A.PLAYER_SKILL_DRAGONLORE))),
    angle: [0, 0, deg(entityYaw(c.caster))],
    colour: [1, 0.12, 0],
    texture: TEX.damage2,
    scaleAt: t => 1.24 ** movesAt(t),
    follow: out => out.set(feet.x, feet.y * 1.19 ** movesAt(fxNow() - t0), feet.z),
    blendMesh: 0,
    blendLight: t => (0.45 ** movesAt(t) < 0.001 ? 0 : 5 * 0.45 ** movesAt(t)),
    blendClamp: true,
    fadeTail: 0,
  });
}

/** BITMAP_LAVA's joint (ZzzEffectJoint.cpp:2742-2752): Lava on its flat face, Scale 20 cm wide, Light 1, MaxTails 10. */
const LAVA_JOINT = { texture: TEX.lava, maxTails: 10, faces: 'flat' as const, maxSegment: cm(60), batch: 66 };
const LAVA_HALF = cm(20 / 2);
/** Its LifeTime 10: it lays a tail a move and dies on the 11th (MoveJoint, ZzzEffectJoint.cpp:6946-6957). */
const LAVA_MOVES = 10;

/** A lava joint: its strip, the bone it rides (36 or 28), how far behind the clip it reads it (ticks), its yaw and moves. */
interface LavaJoint {
  strip: TailStrip;
  bone: 36 | 28;
  lag: number;
  yaw: number;
  moves: number;
}

/**
 * Between DRAGONLORE keys 2 and 8 the lava makes, for i < PlaySpeed x 10, a joint on the caster's bone 36 (sub i) and one on bone
 * 28 (sub 7 + i) (MoveHandlers.cpp:9933-9953). Each rides its bone as the clip stood (PlaySpeed - 0.1 x i) keys ago, a tick less
 * 0.1 x i / PlaySpeed of one, at Light x0.8 a move (ZzzEffectJoint.cpp:6917-6939): read here between the bone a tick ago and now.
 */
function lavaJoints(c: SkillContext, fx: TickedFx, joints: LavaJoint[], speed: number): void {
  const n = Math.fround(Math.fround(speed) * 10);
  const yaw = entityYaw(c.caster);
  for (let i = 0; i < n; i++) {
    for (const bone of [36, 28] as const) joints.push({ strip: fx.strip(LAVA_JOINT), bone, lag: 1 - (0.1 * i) / speed, yaw, moves: 0 });
  }
}

/**
 * BITMAP_LAVA at the caster (MonkSystem.cpp:1268, ZzzEffect.cpp:6141-6147), dying when the caster leaves DRAGONLORE: its joints
 * between keys 2 and 8 (lavaJoints); past key 5 (MoveHandlers.cpp:9954-9967) the wave on the caster (LifeTime then 95) and
 * MODEL_SHOCKWAVE_GROUND01 sub1 where the lava lies (LifeTime then 80, so it runs out 80 ticks on), and each tick past key 5
 * the fire column.
 */
function lava(c: SkillContext): void {
  const at = entityPos(c.caster, 0, new Vector3());
  const yaw = deg(entityYaw(c.caster));
  const embers: Ember[] = [];
  const joints: LavaJoint[] = [];
  const now = { 36: bonePos(c.caster, 36, new Vector3()), 28: bonePos(c.caster, 28, new Vector3()) };
  const before = { 36: now[36].clone(), 28: now[28].clone() };
  const tail = new Vector3();
  let lifeTime = LAVA_TICKS;
  let seen = false;
  let alive = true;
  eachMove(c.scene, at, (_m, fx) => {
    const m = c.caster.modelObject;
    const inClip = !entityGone(c.caster) && m?.CurrentAction === A.PLAYER_SKILL_DRAGONLORE;
    seen ||= inClip;
    alive &&= !entityGone(c.caster) && !(seen && !inClip) && lifeTime > 0;
    before[36].copyFrom(now[36]);
    before[28].copyFrom(now[28]);
    bonePos(c.caster, 36, now[36]);
    bonePos(c.caster, 28, now[28]);
    if (alive && inClip && m && m.actionFrame() > 2 && m.actionFrame() < 8) lavaJoints(c, fx, joints, clipSpeed(c, A.PLAYER_SKILL_DRAGONLORE));
    for (let i = joints.length - 1; i >= 0; i--) {
      const j = joints[i];
      if (entityGone(c.caster) || ++j.moves > LAVA_MOVES) {
        fx.drop(joints.splice(i, 1)[0].strip);
        continue;
      }
      j.strip.light = 0.8 ** j.moves;
      Vector3.LerpToRef(now[j.bone], before[j.bone], j.lag, tail);
      j.strip.push(tail.x, tail.y, tail.z, LAVA_HALF, j.yaw, 0);
    }
    if (alive && inClip && m && m.actionFrame() > 5) {
      if (lifeTime > 100) {
        roarWave(c);
        lifeTime = 95;
      }
      if (lifeTime > 80) {
        shockGround(c, at.clone(), yaw, [1, 0.1, 0], 1, true);
        lifeTime = 80;
      }
      fireColumn(at, lifeTime, embers);
    }
    if (alive) lifeTime--;
    let n = 0;
    for (const e of embers) {
      if (moveEmber(e, fx)) embers[n++] = e;
      else spent.push(e);
    }
    embers.length = n;
    return alive || n > 0 || joints.length > 0;
  });
}

/** MODEL_DRAGON_LOWER_DUMMY (knight_plancrack_dragon.bmd, ZzzOpenData.cpp:4642). */
const DRAGON_LOWER = 'Effect/knight_plancrack_dragon.glb';
/** Its one action's 10 keys; PlayAnimation wraps it there (ZzzBMD.cpp:772-796). */
const DRAGON_KEYS = 10;
/** Each of its meshes scrolls V `-(int)WorldTime % 2000 * 0.0001` (ZzzObject.cpp:2541-2549). */
const dragonScroll = (now: number): number => -((now * 1000) % 2000) * 0.0001;
/** Grandmark2 and grandmark in (1, 0.8, 0.2), lines2 in (1, 0.2, 0.1), each x Alpha, bright (ZzzObject.cpp:2536-2550). */
const DRAGON_MESHES = [
  { colour: [1, 0.8, 0.2] as RGB, scrollV: dragonScroll },
  { colour: [1, 0.2, 0.1] as RGB, scrollV: dragonScroll },
  { colour: [1, 0.8, 0.2] as RGB, scrollV: dragonScroll },
];
/** The Light its draw leaves on it, which the sparks it throws take (ZzzObject.cpp:2545-2547). */
const DRAGON_LIGHT: RGB = [1, 0.2, 0.1];
/** Past its key 1 (its move 3) it has 80 moves left (MoveHandlers.cpp:10036-10042): drawn as it is made and after moves 1-81. */
const DRAGON_MOVES = 82;
/** The blow's LifeTime (ZzzEffect.cpp:4793-4806); BITMAP_LIGHT_RED sub4's (ZzzEffect.cpp:6040-6045). */
const BLOW_LIFE = 50;
const LIGHT_RED_LIFE = 50;
/** The skill whose light rows the blow's light reads. */
const DRAGON_ROAR = 264;

/** A light anchored at `p`. */
const at = (p: Vector3) => (out: { x: number; y: number; z: number }): void => {
  out.x = p.x;
  out.y = p.y;
  out.z = p.z;
};

/** The dragon's AnimationFrame on: 0.3 a move and 0.05 a draw (ZzzEffect.cpp:9555-9561), wrapped at its last key. */
function dragonKey(frame: number, step: number): number {
  const f = Math.fround(frame + step);
  return f >= DRAGON_KEYS ? Math.fround((Math.trunc(f) % DRAGON_KEYS) + f - Math.trunc(f)) : f;
}

/**
 * At its LifeTime 30 the blow lets out MODEL_DRAGON_LOWER_DUMMY and BITMAP_LIGHT_RED sub4 55 cm from where it was made toward the
 * caster's target (MoveHandlers.cpp:7650-7665; with none its StartPosition is whatever was left, here no step). The dummy
 * (ZzzEffect.cpp:6149-6161): Scale 0.8, 10 cm over the ground, Angle[2] 45-224, Alpha x0.96 a move. Returns where they are.
 */
function letOut(c: SkillContext, from: Vector3, toward: Vector3 | null): Vector3 {
  const way = toward ? toward.subtract(from) : new Vector3();
  if (way.lengthSquared() > 0) way.normalize().scaleInPlace(cm(55));
  const spot = from.add(way);
  effects.spawn('summon', c.scene, new Vector3(spot.x, groundY(spot.x, spot.z) + cm(10), spot.z), {
    model: DRAGON_LOWER,
    seconds: ticks(DRAGON_MOVES),
    scale: 0.8,
    yaw: -(45 + randInt(180)) * DEG,
    meshes: DRAGON_MESHES,
    clip: 0,
    keysPerTick: 0.35,
    drive: (body, t) => {
      body.alpha = 0.96 ** Math.floor(t + 1e-6);
    },
  });
  // LIGHT_RED sub4's AddTerrainLight as it is made (ZzzEffect.cpp:6046-6055).
  lighting.skillBody(c.scene, DRAGON_ROAR, 'made', at(spot));
  return spot;
}

/**
 * MODEL_BLOW_OF_DESTRUCTION sub2 at the caster (MonkSystem.cpp:1274, ZzzEffect.cpp:4793-4806), drawing nothing itself: while its
 * LifeTime is 35 to 15 the screen shakes (EarthQuake (rand() % 8 - 4) x 0.1, MoveHandlers.cpp:7641-7648), and at 30 it lets out
 * the dragon (letOut). The dragon's moves (MoveHandlers.cpp:10022-10046): a SPARK sub12 from 250 cm above sea level in its Light
 * each move its key is past 1 and short of 6; its BITMAP_LIGHT_RED sub1 draws nothing and dies on its first move. The light
 * (ZzzEffect.cpp:9563-9599, MoveHandlers.cpp:9640-9650): flare01_red 3 tiles across on the ground, drawn twice at LifeTime x 0.01.
 */
function blow(c: SkillContext): void {
  const from = entityPos(c.caster, 0, new Vector3());
  const toward = c.target && !entityGone(c.target) ? entityPos(c.target, 0, new Vector3()) : null;
  const sparks: Ember[] = [];
  let spot: Vector3 | null = null;
  let out = 0;
  let frame = 0;
  eachMove(c.scene, from, (m, fx) => {
    const lifeTime = BLOW_LIFE + 1 - m;
    // Spawned in the ticked step, the shake rolls this tick and runs to LifeTime 15.
    if (lifeTime === 35) effects.spawn('quake', c.scene, from, { seconds: ticks(22), min: -0.4, max: 0.3 });
    if (lifeTime === 30) {
      spot = letOut(c, from, toward);
      out = m;
      frame = dragonKey(0, 0.05);
    }
    const k = m - out;
    if (spot && k > 0 && k < DRAGON_MOVES) {
      frame = dragonKey(frame, 0.3);
      if (frame > 1 && frame < 6) sparks.push(spark(spot.x, cm(250), spot.z, DRAGON_LIGHT));
      frame = dragonKey(frame, 0.05);
    }
    if (spot && k === 1) lighting.skillBody(c.scene, DRAGON_ROAR, 'lightRed', at(spot));
    if (spot && k < LIGHT_RED_LIFE) {
      for (let pass = 0; pass < 2; pass++) fx.decal(TEX.flareRed, RGBS.white, spot.x, spot.z, 3, 0, (LIGHT_RED_LIFE - k) * 0.01);
    }
    let n = 0;
    for (const e of sparks) {
      if (moveEmber(e, fx)) sparks[n++] = e;
      else spent.push(e);
    }
    sparks.length = n;
    return lifeTime > 1 || (spot !== null && k < Math.max(DRAGON_MOVES, LIGHT_RED_LIFE)) || n > 0;
  });
}

/**
 * At the packet BITMAP_LAVA and MODEL_BLOW_OF_DESTRUCTION sub2 (MonkSystem.cpp:1262-1280): the blow shakes the screen and lets the
 * dragon out on its LifeTime (blow); the lava's waves and fire wait for the caster's DRAGONLORE key 5 and never come if the clip
 * is left first (:9922-10014).
 */
const dragonRoar: Step = (_at, c) => {
  blow(c);
  lava(c);
};

/** LIGHT_RED sub4's AddTerrainLight a move: (0.4, 0, 0) + rand() % 5 x 0.1 on each, rolled a tick (MoveHandlers.cpp:9640-9650). */
let redTick = -1;
let redRoll = 0;
function lightRed(out: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  const tick = Math.floor(fxNow() / TICK + 1e-6);
  if (tick !== redTick) {
    redTick = tick;
    redRoll = randInt(5) * 0.1;
  }
  out.r = 0.4 + redRoll;
  out.g = redRoll;
  out.b = redRoll;
  return out;
}

export default defineSkill({
  id: 264,
  name: "Dragon Roar",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [560],
  noFlinch: [A.PLAYER_SKILL_DRAGONLORE], // SetPlayerShock leaves the roar alone (ZzzCharacter.cpp:1283-1297)
  visual: { area: dragonRoar },
  sound: 'Sound/Ragefighter/Rage_Dragonlower', // Dragon Roar
  delayMs: 700, // Dragon Roar
  clip: { ground: A.PLAYER_SKILL_DRAGONLORE }, // Dragon Roar
  // BITMAP_LIGHT_RED sub4's AddTerrainLight: (1, 0.2, 0.2) + 0-0.04, range 4, as it is made, then lightRed, range 3, each of its
  // 50 moves (ZzzEffect.cpp:6046-6055, MoveHandlers.cpp:9640-9650).
  light: {
    bodies: {
      made: { color: [1.02, 0.22, 0.22], range: 4, seconds: TICK, release: 0 },
      lightRed: { color: lightRed, range: 3, seconds: ticks(LIGHT_RED_LIFE), release: 0 },
    },
  },
});
