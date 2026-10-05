import { type BoneGlow, type GroundGlow } from '@/controllers/fx/aura';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { effects } from '@/controllers/fx';
import { TICK, bonePos, entityGone, entityPos, entityYaw, followEntity, fxNow, type RGB } from '@/controllers/fx/core';
import type { EffectHandle } from '@/controllers/fx/layer';
import type { TickedFx } from '@/controllers/fx/ticked';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { after, cm, seq, ticks, type BuffLook, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { PlayerAction } from '@versions/shared/objects/enum';
import type { ClipPick } from '@/controllers/combat';
import type { Sounds } from '@/controllers/sound';
import { DEG, deg, groundY, movesAt, randInt } from '../_shared';
import { createAngleDeg } from '@/core/turnAngle';
import type { Entity } from '@/ecs/world';

/** A BITMAP_SPARK particle in flight: where it is (tiles), its drift (tiles a move), its Gravity (cm a move, up) and LifeTime. */
export interface FallingSpark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  gravity: number;
  life: number;
}

/**
 * One move of a BITMAP_SPARK (ZzzEffectParticle.cpp:6558-6608): it loses a LifeTime, climbs by a Gravity that loses 2 a move,
 * bounces off the ground at 0.6 for 4 more of its LifeTime, and drifts. Returns the Light it is drawn at, LifeTime / 16, or -1 once
 * it is gone.
 */
export function fallSpark(s: FallingSpark): number {
  if (--s.life <= 0) return -1;
  const light = s.life / 16;
  s.y += cm(s.gravity);
  s.gravity -= 2;
  const ground = groundY(s.x, s.z);
  if (s.y < ground) {
    s.y = ground;
    s.gravity = -s.gravity * 0.6;
    s.life -= 4;
  }
  s.x += s.vx;
  s.z += s.vz;
  return light;
}

const towardFrom = new Vector3();
const towardTo = new Vector3();
/** CreateAngle2D from the caster to `target`, MU degrees (ZzzAI.cpp:82-100). */
export function angleToward(c: SkillContext, target: Entity): number {
  entityPos(c.caster, 0, towardFrom);
  entityPos(target, 0, towardTo);
  return createAngleDeg(towardFrom.x, towardFrom.z, towardTo.x, towardTo.z);
}

/** Moves an effect made at `t0` on the effects clock has made by now. */
export const movesSince = (t0: number): number => movesAt(fxNow() - t0);

/**
 * `Models[MODEL_PLAYER].Actions[action].PlaySpeed`, 0.4 at attack speed 0 (SetAttackSpeed, ZzzCharacter.cpp:1018-1023): the
 * caster's while it plays the clip.
 */
export function clipSpeed(c: SkillContext, action: PlayerAction): number {
  const m = c.caster.modelObject;
  return m?.CurrentAction === action && m.AnimationSpeed > 0 ? m.AnimationSpeed : 0.4;
}

/**
 * `move(m, fx)` once for each move m = 1, 2 .. of an effect made now, counted on the effects clock (a ticked script's own count
 * runs a tick early when it is made inside the clock's step); it ends when `move` returns false.
 */
export function eachMove(scene: Scene, at: Vector3, move: (m: number, fx: TickedFx) => boolean): void {
  const t0 = fxNow();
  let done = 0;
  effects.spawn('ticked', scene, at, {
    tick(fx) {
      for (const m = movesSince(t0); done < m; ) if (!move(++done, fx)) return false;
      return true;
    },
  });
}

/**
 * The owner's angle while a wolf head throws: Angle[2] +-(base + rand() % 3) x 1, 3 or 5, and Angle[0] by as much one time in
 * three each way (MoveHandlers.cpp:9156-9167, :9761-9772). [pitch, yaw], degrees.
 */
export function shake(yaw: number, base: number): [number, number] {
  const n = randInt(6);
  const k = (base + randInt(3)) * ((n % 3) * 2 + 1);
  const t = randInt(3);
  return [t === 1 ? k : t === 2 ? -k : 0, n >= 3 ? yaw + k : yaw - k];
}

/**
 * A wolf head made on bone `from` at `scale`, the original's angle `angle`: from its first move at `ridingScale`, it rides
 * bone `rides` on the moves `riding(m)` allows and holds still between; it dies on move ceil(`life`), its LifeTime run out.
 */
export function wolfHead(c: SkillContext, model: string, colour: RGB, angle: readonly [number, number, number], from: number, rides: number, scale: number, ridingScale: number, life: number, riding: (m: number) => boolean): void {
  const t0 = fxNow();
  const last = bonePos(c.caster, from, new Vector3());
  const dies = Math.ceil(life);
  effects.spawn('model', c.scene, last.clone(), {
    model,
    seconds: Infinity,
    scale,
    scaleAt: () => (movesSince(t0) > 0 ? ridingScale : scale),
    colour,
    angle,
    fadeTail: 0,
    until: () => movesSince(t0) >= dies || entityGone(c.caster),
    follow: out => out.copyFrom(riding(movesSince(t0)) ? bonePos(c.caster, rides, last) : last),
  });
}

/**
 * A thrown wolf head (MODEL_WOLF_HEAD_EFFECT sub1/2, MODEL_WOLF_HEAD_EFFECT2 sub4/6): made on the owner's bone 27 at [pitch,
 * yaw], it flies `speed` cm a tick along that angle (its Direction[1], MoveParticle, ZzzEffect.cpp:6231-6247) for `life` ticks.
 */
export function throwHead(c: SkillContext, model: string, colour: RGB, angle: readonly [number, number], scale: number, life: number, speed: number): void {
  const from = bonePos(c.caster, 27, new Vector3());
  const p = angle[0] * DEG;
  const y = angle[1] * DEG;
  const step = cm(speed);
  const dx = step * Math.cos(p) * Math.sin(y);
  const dy = -step * Math.sin(p);
  const dz = -step * Math.cos(p) * Math.cos(y);
  const t0 = fxNow();
  effects.spawn('model', c.scene, from.clone(), {
    model,
    seconds: ticks(life),
    scale,
    colour,
    angle: [angle[0], 0, angle[1]],
    fadeTail: 0,
    follow: out => {
      const m = movesSince(t0);
      return out.set(from.x + dx * m, from.y + dy * m, from.z + dz * m);
    },
  });
}

/** The two clips a party buff (266-268) picks between, evens (SetRageSkillAni, MonkSystem.cpp:2866-2874). */
export const PARTY_BUFF_CLIPS: readonly PlayerAction[] = [PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES, PlayerAction.PLAYER_SKILL_HP_UP_OURFORCES];
/** `rand_fps_check(2)`: the party buffs toss a coin for their clip rather than go by the caster. */
export const partyBuffClip: ClipPick = () => PARTY_BUFF_CLIPS[Math.random() < 0.5 ? 0 : 1];
/** The sound goes with the toss (SkillCast.cpp:915-931): ATT_UP with Rage_Buff_1, HP_UP with Rage_Buff_2. */
export const partyBuffSound = (clip: PlayerAction): Sounds =>
  clip === PARTY_BUFF_CLIPS[1] ? 'Sound/Ragefighter/Rage_Buff_2' : 'Sound/Ragefighter/Rage_Buff_1';

/** The Ourforces glow's 17 bones, in three breathing groups (ZzzEffect.cpp:9602-9636). */
const OURFORCES_BONES = [12, 17, 5, 10, 36, 27, 37, 28, 11, 35, 2, 3, 36, 20, 27, 4, 26] as const;
const OURFORCES_SLOW = new Set([5, 12, 7, 8, 9, 14, 15, 16]);
const ourforcesBreathe = (t: number, i: number): number =>
  i < 3 ? (Math.sin(t * 10) + 1) * 0.25 + 0.2 : OURFORCES_SLOW.has(i) ? (Math.sin(t * 5) + 1) * 0.25 + 0.5 : (Math.sin(t * 10) + 1) * 0.3 + 0.3;
export const OURFORCES_GLOW: BoneGlow = { bones: OURFORCES_BONES, texture: TEX.flareRed, colour: RGBS.white, size: 0.96, breathe: ourforcesBreathe };
/** With it, flare01_red 3.5 across under the body, drawn twice, (sin(WorldTime x 0.0005) + 1) x 0.25 + 0.2 bright (ZzzEffect.cpp:9563-9583). */
export const OURFORCES_GROUND: GroundGlow = { texture: TEX.flareRed, colour: RGBS.white, size: 3.5, count: 2, breathe: t => (Math.sin(t * 0.5) + 1) * 0.25 + 0.2 };

/** eBuff_Cloaking (_enum.h:3913). */
const CLOAKING = 18;
/** The Ourforces buffs, each with the master ones that count as it: Ignore Defense, Increase Health, Increase Block (magicEffects.ts). */
const OURFORCES: readonly (readonly number[])[] = [[129], [130, 155], [131, 153, 154]];
const BLOCK_UP = OURFORCES[2];

function holds(e: Entity, ids: readonly number[]): boolean {
  const buffs = e.buffs;
  if (buffs) for (const id of ids) if (buffs.has(id)) return true;
  return false;
}

/**
 * The BITMAP_LIGHT_RED riding `e`, one for each Ourforces buff it holds (WSclient.cpp:15662-15678). Each one's move rolls for
 * the mirror on an Increase Block body and makes a smoke on an Ignore Defense one (MoveHandlers.cpp:9617-9672), so they add up.
 */
function lightReds(e: Entity): number {
  let n = 0;
  for (const ids of OURFORCES) if (holds(e, ids)) n++;
  return n;
}

/** A BITMAP_SMOKELINE1 sub5 an Ignore Defense body gives off: where it is from the feet (tiles), Scale, turn, rise (cm a tick), Alpha, LifeTime. */
interface Smoke {
  dx: number;
  dy: number;
  dz: number;
  scale: number;
  roll: number;
  rise: number;
  alpha: number;
  life: number;
}
const SMOKE_LIGHT: RGB = [1, 0.12, 0];
/** The Alpha steps in the original's floats: 0.7 less six 0.1 is under 0.1 there, so a smoke is drawn 30 ticks. */
const TENTH = Math.fround(0.1);
const SEVEN_TENTHS = Math.fround(0.7);
const smokeBone = new Vector3();
const smokeFeet = new Vector3();
const spentSmokes: Smoke[] = [];

/**
 * BITMAP_LIGHT_RED sub1 on an Ignore Defense body (MoveHandlers.cpp:9659-9672): each tick a SMOKELINE1 sub5 from bone 26 or 35,
 * red (1, 0.12, 0), riding the body: smokelines01 64 px x 0.005 x (0.96-1.91), growing 0.06-0.08 and climbing 1.2-2.7 cm a tick,
 * its Alpha in by 0.2-0.6 a tick to 0.7 and out by 0.1 under its LifeTime 10 of 35 (ZzzEffectParticle.cpp:1767-1786, :5963-5990).
 */
export const ourforcesSmoke: BuffLook = (e, scene) => {
  const smokes: Smoke[] = [];
  let beat = fxNow();
  // Moved after the aura that makes them (fx/layers.ts), so in the frame they are made; done once the aura stops beating.
  eachMove(scene, entityPos(e, 0, new Vector3()), (_m, fx) => {
    const feet = entityPos(e, 0, smokeFeet);
    let n = 0;
    for (const s of smokes) {
      if (--s.life < 10) s.alpha = Math.fround(s.alpha - TENTH);
      else if (s.alpha < SEVEN_TENTHS) s.alpha = Math.fround(s.alpha + Math.fround((randInt(5) + 2) * TENTH));
      else s.alpha = SEVEN_TENTHS;
      if (s.life <= 0 || s.alpha < TENTH) {
        spentSmokes.push(s);
        continue;
      }
      s.scale += (randInt(3) + 6) * 0.01;
      s.dy += cm(s.rise);
      const size = cm(64 * s.scale);
      fx.sprite(TEX.smokeLine1, SMOKE_LIGHT, feet.x + s.dx, feet.y + s.dy, feet.z + s.dz, size, size, s.roll * DEG, Math.min(1, s.alpha));
      smokes[n++] = s;
    }
    smokes.length = n;
    return n > 0 || fxNow() - beat < 2 * TICK;
  });
  const smoke = (): void => {
    beat = fxNow();
    // None while cloaked (MoveHandlers.cpp:9657-9658).
    if (entityGone(e) || e.buffs?.has(CLOAKING)) return;
    const feet = entityPos(e, 0, smokeFeet);
    for (let i = lightReds(e); i > 0; i--) {
      const at = bonePos(e, randInt(2) ? 26 : 35, smokeBone);
      const s = spentSmokes.pop() ?? { dx: 0, dy: 0, dz: 0, scale: 0, roll: 0, rise: 0, alpha: 0, life: 0 };
      s.dx = at.x - feet.x;
      s.dy = at.y - feet.y;
      s.dz = at.z - feet.z;
      s.scale = (randInt(96) + 96) * 0.01 * 0.005;
      s.roll = randInt(360);
      s.rise = (randInt(16) + 12) * 0.1;
      s.alpha = 0;
      s.life = 35;
      smokes.push(s);
    }
  };
  return { pulse: { every: TICK, fire: smoke } };
};

/**
 * MODEL_WINDFOCE_MIRROR (wind_foce_mirror.bmd) riding the body, LifeTime 50, gone once the body loses Increase Block
 * (ZzzEffect.cpp:6061-6066, MoveHandlers.cpp:9675-9692): it turns to WorldTime x 0.4 degrees, Scale x1.015 a tick to 1.5 and
 * Light (0.6, 0.6, 1) x0.9 a tick, drawn x 6, clamped (ZzzObject.cpp:2511-2516).
 */
const windForceMirror = (scene: Scene, e: Entity): { alive: boolean } =>
  effects.spawn('model', scene, entityPos(e, 0, new Vector3()), {
    model: MODEL.windForceMirror,
    seconds: ticks(50),
    follow: followEntity(e, 0),
    until: () => entityGone(e) || !holds(e, BLOCK_UP),
    // Degrees a ms of WorldTime as radians a second; MU's yaw turns the other way.
    spin: -0.4 * 1000 * DEG,
    scaleAt: t => Math.min(1.5, 1.015 ** movesAt(t)),
    colour: [0.6, 0.6, 1],
    blendMesh: 0,
    blendLight: t => 6 * 0.9 ** movesAt(t),
    blendClamp: true,
    fadeTail: 0,
  });

/**
 * BITMAP_LIGHT_RED sub2 on an Increase Block body (MoveHandlers.cpp:9624-9636): one tick in 70 a mirror wind pillar while none
 * is up, rolled by each BITMAP_LIGHT_RED the body carries.
 */
export const ourforcesMirror: BuffLook = (e, scene) => {
  let mirror: { alive: boolean } | null = null;
  const roll = (): void => {
    for (let i = lightReds(e); i > 0; i--) if (randInt(70) === 7 && !mirror?.alive && !entityGone(e)) mirror = windForceMirror(scene, e);
  };
  return { pulse: { every: TICK, fire: roll } };
};

/** The MODEL_WINDFOCE sub1 on each body, the last Increase Block's: DeleteEffect before CreateEffect (WSclient.cpp:5078-5081). */
const blockPillars = new WeakMap<Entity, EffectHandle>();
/** The ticks it stands before it asks for a buff: the original registers Increase Block as it makes it (WSclient.cpp:5089-5102), ours comes in its own packet. */
const BLOCK_PILLAR_GRACE = 25;

/**
 * Increase Block's MODEL_WINDFOCE sub1 (WSclient.cpp:5072-5081) on the body the cast is for: the hero's target, or another
 * caster himself. LifeTime 999, kept while the body holds any Ourforces buff (ZzzEffect.cpp:6004-6013, MoveHandlers.cpp:9556-9575):
 * Scale 1, turning to -WorldTime x 0.3 degrees, Light (0.6, 0.6, 1) x ((sin(WorldTime x 0.001) + 1) x 0.25 + 0.2), drawn x 6,
 * clamped (ZzzObject.cpp:2509-2514).
 */
export const blockPillar: Step = (_at, c) => {
  const body = c.caster.localPlayer && c.target ? c.target : c.caster;
  blockPillars.get(body)?.stop();
  const t0 = fxNow();
  const pillar = effects.spawn('model', c.scene, entityPos(body, 0, new Vector3()), {
    model: MODEL.windForce,
    seconds: Infinity,
    follow: followEntity(body, 0),
    until: () => entityGone(body) || (movesSince(t0) >= BLOCK_PILLAR_GRACE && lightReds(body) === 0),
    // Degrees a ms of WorldTime as radians a second; MU's yaw turns the other way.
    spin: 0.3 * 1000 * DEG,
    colour: [0.6, 0.6, 1],
    blendMesh: 0,
    blendLight: () => 6 * ((Math.sin(fxNow()) + 1) * 0.25 + 0.2),
    blendClamp: true,
    fadeTail: 0,
  });
  blockPillars.set(body, pillar);
  return pillar;
};

/** The ticks a wind pillar raises its sub 3: LifeTime 40 and 30 of 50, or 60 and 50 of 70 (MoveHandlers.cpp:9538, :9590). */
const WIND_FORCE_THROWS = [11, 21];

/**
 * One MODEL_WINDFOCE (wind_foce.bmd) at `at`, where it stays. Each tick it turns to `-WorldTime * 0.3` degrees, or
 * `* 0.9` when `fast` (sub 2, 3), grows 0.1 up to 3 and keeps 0.9 of its Light (0.85 fast) (MoveHandlers.cpp:9524-9609);
 * LifeTime 50, 70 fast (ZzzEffect.cpp:6004-6023). Drawn RENDER_BRIGHT at Light x 6, clamped (ZzzObject.cpp:2509-2514):
 * the blend is (ONE, ONE), so the Alpha it also loses shows nothing.
 */
function windPillar(colour: RGB, fast: boolean): Step {
  const keep = fast ? 0.85 : 0.9;
  // Degrees a ms of WorldTime as radians a second; MU's yaw turns the other way.
  const spin = ((fast ? 0.9 : 0.3) * 1000 * Math.PI) / 180;
  return (at, c) =>
    effects.spawn('model', c.scene, at, {
      model: MODEL.windForce,
      seconds: ticks(fast ? 70 : 50),
      yaw: -entityYaw(c.caster),
      spin,
      scaleAt: t => Math.min(3, 1 + 0.1 * movesAt(t)),
      colour,
      blendMesh: 0,
      blendLight: t => 6 * keep ** movesAt(t),
      blendClamp: true,
      fadeTail: 0,
    });
}

/**
 * The wind pillar Dark Side and the Ourforces buffs raise at the caster's feet (MonkSystem.cpp:1151, :1179, :1209,
 * :1298), and the fast sub 3 pillar it raises where it stands on its 11th and 21st tick, in `thrown`'s Light.
 */
export const windForce = (colour: RGB, fast: boolean, thrown: RGB): Step => {
  const own = windPillar(colour, fast);
  const sub3 = windPillar(thrown, true);
  return (_at, c) => {
    const feet = entityPos(c.caster, 0, new Vector3());
    own(feet, c);
    for (const tick of WIND_FORCE_THROWS) after(ticks(tick), sub3)(feet, c);
  };
};

/** BITMAP_SWORD_EFFECT_MONO's particle Scale after `n` moves: x1.2 until past 6 (move 10), then x0.8 (ZzzEffectParticle.cpp:8861-8886). */
const monoScale = (n: number): number => (n <= 10 ? 1.2 ** n : 1.2 ** 10 * 0.8 ** (n - 10));
/** Its Light: x0.94 a move, but not on the move it turns. */
const monoLight = (n: number): number => 0.94 ** (n < 10 ? n : n - 1);
/** It is drawn after moves 1-18: on move 19 its Scale is under 1 and it dies. */
const MONO_MOVES = 18;
/** The effect's LifeTime (ZzzEffect.cpp:6068-6073). */
const MONO_LIFE = 15;
/** MODEL_SHOCKWAVE01 sub 2's LifeTime 5 / 0.3: drawn after moves 1-16 (ZzzEffect.cpp:5887-5891). */
const WAVE_TICKS = 17;

/**
 * MODEL_SHOCKWAVE01 sub 2 at `feet`: each move Scale x1.24, Position[2] x1.19 (the height above sea level, so it rises off
 * high ground) and Light x0.45, zeroed under 0.001 (MoveHandlers.cpp:9387-9395); drawn twice at Light x 15
 * (ZzzObject.cpp:2467-2473), so twice here.
 */
function swordFlashWave(scene: Scene, feet: Vector3, yaw: number, light: RGB): void {
  const t0 = fxNow();
  for (let pass = 0; pass < 2; pass++) {
    effects.spawn('model', scene, feet.clone(), {
      model: MODEL.shockwave,
      seconds: ticks(WAVE_TICKS),
      angle: [0, 0, yaw],
      colour: light,
      scaleAt: t => 1.24 ** movesAt(t),
      follow: out => out.set(feet.x, feet.y * 1.19 ** movesAt(fxNow() - t0), feet.z),
      blendMesh: 0,
      blendLight: t => (light[0] * 0.45 ** movesAt(t) < 0.001 ? 0 : 15 * 0.45 ** movesAt(t)),
      blendClamp: true,
      fadeTail: 0,
    });
  }
}

/**
 * BITMAP_SWORD_EFFECT_MONO where the caster stands, LifeTime 15 (MonkSystem.cpp:1140, :1169, :1198). Each move on a LifeTime 3
 * does not divide (ticks 2, 3, 5 .. 15) makes a Swordeff_mono particle in its Light, and LifeTime 14 (tick 2) the shock wave in
 * `wave` (MoveHandlers.cpp:9705-9730). A particle moves in the frame it is made; it is drawn 64 px x Scale x 0.9 wide and x 1.1
 * high, 31 cm x Scale over the feet (ZzzEffectParticle.cpp:3820-3825, :9324-9330).
 */
export const swordFlash = (light: RGB, wave: RGB): Step => (_at, c) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  const yaw = deg(entityYaw(c.caster));
  const born: number[] = [];
  effects.spawn('ticked', c.scene, feet, {
    tick(fx, n) {
      const lifeTime = MONO_LIFE + 1 - n;
      if (n > 0 && lifeTime > 0) {
        if (lifeTime % 3 !== 0) born.push(n);
        if (lifeTime === 14) swordFlashWave(fx.scene, feet, yaw, wave);
      }
      let drawn = false;
      for (const b of born) {
        const m = n - b + 1;
        if (m > MONO_MOVES) continue;
        const s = monoScale(m);
        fx.sprite(TEX.swordEffMono, light, feet.x, feet.y + cm(31 * s), feet.z, cm(64 * 0.9 * s), cm(64 * 1.1 * s), 0, monoLight(m));
        drawn = true;
      }
      return drawn || lifeTime > 1;
    },
  });
};

/**
 * BITMAP_EVENT_CLOUD (clouds2) at the caster's feet, LifeTime 30 (ZzzEffect.cpp:5993-6002): each move Scale x1.08 up to `cap`
 * (3, sub1 5) and Light x0.9, turned -WorldTime x 0.5 degrees (MoveHandlers.cpp:9495-9518), drawn on the ground at its Light
 * (ZzzEffect.cpp:9543-9548). WorldTime's phase is not kept: every cloud starts its turn at 0.
 */
export const eventCloud = (light: RGB, cap = 3): Step => (_at, c) =>
  effects.spawn('ring', c.scene, entityPos(c.caster, 0, new Vector3()), {
    texture: TEX.eventCloud,
    colour: light,
    seconds: ticks(30),
    scaleAt: t => Math.min(cap, 1.08 ** movesAt(t)),
    brightness: t => 0.9 ** movesAt(t),
    spin: -500,
    fadeTail: 0,
  });

/**
 * BITMAP_MAGIC sub13 / 14 (Magic_Ground1) at the caster's feet, Scale 1 (ZzzEffect.cpp:1179-1184): each move Scale x1.1 and
 * Light x0.95, halved again past Scale 4; past 8 (move 22) it dies (MoveHandlers.cpp:1424-1448). Drawn twice at the
 * caster's facing (ZzzEffect.cpp:9776-9780), so twice here.
 */
export const magicGround13 = (light: RGB): Step => (_at, c) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  const turn = -deg(entityYaw(c.caster));
  for (let pass = 0; pass < 2; pass++) {
    effects.spawn('ring', c.scene, feet, {
      texture: TEX.magicGround,
      colour: light,
      seconds: ticks(22),
      scaleAt: t => 1.1 ** movesAt(t),
      brightness: t => 0.95 ** movesAt(t) * 0.5 ** Math.max(0, movesAt(t) - 14),
      spinFrom: turn,
      fadeTail: 0,
    });
  }
};

/**
 * MODEL_SHOCKWAVE_GROUND01 (shockwave_ground01.bmd) at `at`, turned `yaw` degrees: sub0 lives LifeTime 20 keeping 0.8 of its Light a
 * move, sub1 lives 50 keeping 0.9 and draws Kwave2 (ZzzEffect.cpp:6109-6128); each move Scale x1.2 (MoveHandlers.cpp:9803-9822),
 * drawn bright at Light x 6, clamped (ZzzObject.cpp:2515-2534).
 */
export function shockGround(c: SkillContext, at: Vector3, yaw: number, light: RGB, scale: number, sub1 = false): void {
  const keep = sub1 ? 0.9 : 0.8;
  effects.spawn('model', c.scene, at, {
    model: MODEL.shockwaveGround,
    seconds: ticks(sub1 ? 50 : 20),
    angle: [0, 0, yaw],
    colour: light,
    ...(sub1 ? { texture: TEX.kwave2 } : {}),
    scaleAt: t => scale * 1.2 ** movesAt(t),
    blendMesh: 0,
    blendLight: t => 6 * keep ** movesAt(t),
    blendClamp: true,
    fadeTail: 0,
  });
}
/** A party buff's sub0 at the caster's feet. */
const groundShock = (light: RGB, scale: number): Step => (_at, c) => shockGround(c, entityPos(c.caster, 0, new Vector3()), deg(entityYaw(c.caster)), light, scale);

/** The Lights of a party buff's RageCreateEffect (MonkSystem.cpp:1128-1214). */
export interface OurforcesLights {
  /** BITMAP_SWORD_EFFECT_MONO and the MODEL_SHOCKWAVE01 it sends. */
  flash: RGB;
  wave: RGB;
  /** The three MODEL_SHOCKWAVE_GROUND01, Scale 1, 0.85 and 0.7, each with a BITMAP_EVENT_CLOUD. */
  ring: RGB;
  cloud: RGB;
  /** MODEL_WINDFOCE, and the BITMAP_MAGIC sub13 under it. */
  pillar: RGB;
  magic: RGB;
}

/** A party buff's RageCreateEffect at the caster, in the original's order. */
export const ourforcesCast = (l: OurforcesLights): Step =>
  seq(
    swordFlash(l.flash, l.wave),
    ...[1, 0.85, 0.7].flatMap(s => [groundShock(l.ring, s), eventCloud(l.cloud)]),
    windForce(l.pillar, false, l.pillar),
    magicGround13(l.magic)
  );
