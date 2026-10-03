import { delay, entityGone, entityPos, entityYaw, fxNow, scaleRGB, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { SkillContext, Step, TICK, afterRelease, atCaster, cm, repeat, ring, seq, ticks } from '@/controllers/skills/visuals';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { type TaperShape } from '@/controllers/fx/joint';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { summonLight } from '../_shared';

/** Ice shards / snow motes: BITMAP_FLARE tinted, slow, falling. */
export const ICE_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.ice,
  colourEnd: RGBS.frost,
  size: 0.18,
  life: 0.9,
  power: 1.2,
  gravity: -1.5,
  spin: 2,
};

// ---- misc steps -------------------------------------------------------------------

/** BITMAP_MAGIC+1 sub3 and JOINT_HEALING sub3's tint (ZzzEffect.cpp:9860, ZzzEffectJoint.cpp:3677). */
const SUMMON_TINT: RGB = [1, 0.6, 0.4];
/** JOINT_HEALING: LT 12 and it dies below 0, so 13 moves (ZzzEffectJoint.cpp:481-485, :6954-6957). */
const HEALING_MOVES = 13;
/** Velocity starts at 0 and gains 4 cm a tick, after the move (:2998-3003, :3639). */
const HEALING_ACCEL = cm(4);
/** MoveHumming's 10 degrees a tick on pitch and on yaw (:3664). */
const HEALING_TURN = (10 * Math.PI) / 180;
/** CreateHealing: 3 joints a tick from the upper hemisphere of r 200 cm about the body + 120 cm (ZzzEffect.cpp:67-89). */
const HEALING_PER_TICK = 3;
const HEALING_RADIUS = cm(200);
const HEALING_HEIGHT = cm(120);
/** JOINT_HEALING width 5 (CreateHealing's Scale). */
const HEALING_WIDTH = cm(5);
/** How a streak is drawn: the original's one 5 cm quad on Classic. */
interface StreakLook {
  maxTails: number;
  width: number;
  taper?: TaperShape;
  /** The ribbon sheet, and the fraction of life it ramps up from dark over. */
  texture: string;
  fadeIn: number;
}
const HEALING_LOOK: StreakLook = { maxTails: 1, width: HEALING_WIDTH, texture: TEX.jointEnergy, fadeIn: 1 };

/**
 * One JOINT_HEALING sub1/2/3 streak (ZzzEffectJoint.cpp:3632-3697): it leaves a random point of the
 * hemisphere heading at `centre`, moves by its velocity, speeds up 4 cm a tick and homes 10 degrees
 * a tick on the body + 120 cm. At 312 cm over its life against a 200 cm radius it runs through the
 * chest near its 11th tick and flies on, brightening as `(12 - LT) * 0.1` until it dies. MaxTails 2
 * draws it as one quad from its last tick to its head. At LT 1 a Shiny02 sparkle flashes on the body.
 */
function healingStreak(c: SkillContext, centre: Vector3, colour: RGB, look: StreakLook = HEALING_LOOK): void {
  const el = (Math.floor(Math.random() * 90) * Math.PI) / 180;
  const az = (Math.floor(Math.random() * 360) * Math.PI) / 180;
  const pos = new Vector3(
    centre.x + HEALING_RADIUS * Math.cos(el) * Math.sin(az),
    centre.y + HEALING_RADIUS * Math.sin(el),
    centre.z + HEALING_RADIUS * Math.cos(el) * Math.cos(az)
  );
  let yaw = Math.atan2(centre.x - pos.x, centre.z - pos.z);
  let pitch = -el;
  let v = 0;
  let step = 0;
  const seek = new Vector3();
  const t0 = fxNow();
  const head: PointSource = out => {
    const e = (fxNow() - t0) / TICK;
    for (; step <= Math.min(HEALING_MOVES - 1, Math.floor(e)); step++) {
      const flat = v * Math.cos(pitch);
      pos.x += Math.sin(yaw) * flat;
      pos.z += Math.cos(yaw) * flat;
      pos.y += v * Math.sin(pitch);
      v += HEALING_ACCEL;
      entityPos(c.caster, HEALING_HEIGHT, seek);
      const dx = seek.x - pos.x;
      const dz = seek.z - pos.z;
      const dYaw = Math.atan2(dx, dz) - yaw;
      yaw += Math.max(-HEALING_TURN, Math.min(HEALING_TURN, Math.atan2(Math.sin(dYaw), Math.cos(dYaw))));
      const dPitch = Math.atan2(seek.y - pos.y, Math.hypot(dx, dz) || 1e-3) - pitch;
      pitch += Math.max(-HEALING_TURN, Math.min(HEALING_TURN, dPitch));
    }
    // Between ticks, part of the way along the next move.
    const f = step < HEALING_MOVES ? e - (step - 1) : 0;
    const flat = v * Math.cos(pitch) * f;
    return out.set(pos.x + Math.sin(yaw) * flat, pos.y + v * Math.sin(pitch) * f, pos.z + Math.cos(yaw) * flat);
  };
  effects.spawn('joint', c.scene, pos, {
    head,
    maxTails: look.maxTails,
    width: look.width,
    taper: look.taper,
    texture: look.texture,
    // (12 - LT) * 0.1 over 13 ticks: 0 at birth, 1.2 on the last move.
    colour: [colour[0] * 1.3, colour[1] * 1.3, colour[2] * 1.3],
    seconds: ticks(HEALING_MOVES),
    fadeIn: look.fadeIn,
    fadeTail: 0,
  });
  // CreateSprite(BITMAP_SHINY+1, body + 120, (8..15) * 0.2, Light, ...) on LT 1, for that one tick.
  delay(ticks(HEALING_MOVES - 2), () => {
    const scale = (8 + Math.floor(Math.random() * 8)) * 0.2;
    effects.spawn('sprite', c.scene, entityPos(c.caster, HEALING_HEIGHT, new Vector3()), {
      texture: TEX.shiny2,
      colour: [colour[0] * 1.1, colour[1] * 1.1, colour[2] * 1.1],
      size: cm(32) * scale,
      aspect: 2,
      roll: Math.random() * Math.PI * 2,
      seconds: ticks(1),
      fadeTail: 0,
    });
  });
}

/** CreateHealing, called every tick of a BITMAP_MAGIC+1 sub1/2/3's life: 3 streaks about its spot. */
const createHealing = (colour: RGB, tickCount: number, look?: StreakLook): Step =>
  repeat(tickCount, TICK, (at, c) => {
    const centre = new Vector3(at.x, at.y + HEALING_HEIGHT, at.z);
    for (let i = 0; i < HEALING_PER_TICK; i++) healingStreak(c, centre, colour, look);
  });

/**
 * BITMAP_MAGIC+1 sub3 (ZzzEffect.cpp:9787-9882): Magic_Ground2 at the caster's feet, LT 20, diameter
 * (20 - LT) * 0.15 tiles from 0 to 2.85, still at the caster's facing, dimming 0.2 a tick over its
 * last 5 ticks.
 */
const summonDecal: Step = (at, c) =>
  ring({
    texture: TEX.magicGround2,
    colour: SUMMON_TINT,
    seconds: ticks(20),
    scale: 2.85,
    growFrom: 0,
    grow: 1,
    spinFrom: (entityYaw(c.caster) * 180) / Math.PI,
    fadeTail: 0.25,
  })(at, c);

/** The elf summons' cast at the release (AttackTime 15 or the clip's key 5, ZzzCharacter.cpp:4132-4157): the orange circle and its 60 streaks, where the caster stands then. */
export const elfSummon: Step = afterRelease(atCaster(seq(summonDecal, createHealing(SUMMON_TINT, 20)), 0));

// Enhanced and Ultra: the same circle and streaks, drawn to read at our camera, with ground glow,
// embers off the circle and the light they throw.

/**
 * The streaks as tapered comets two ticks long, lit from earlier in their life. JointEnergy01
 * is an 8 x 4 blue-grey sheet (max 0.4 red), so (1, 0.6, 0.4) on it is a faint lavender hairline at our camera;
 * the neutral Flare02 capsule takes the original's orange as it is.
 */
const SUMMON_GRACE_STREAK: StreakLook = {
  maxTails: 2,
  width: cm(14),
  taper: { nose: 1, span: 0.1, hold: 0.1, falloff: 1.2 },
  texture: TEX.flare2,
  fadeIn: 0.5,
};
/** The streaks' orange held under 1 at their peak: (1, 0.6, 0.4) x 1.2 clips to cream on the bright sheet. */
const SUMMON_STREAK_TINT: RGB = [0.78, 0.4, 0.2];
/** Embers lifting off the circle while it opens. */
const SUMMON_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: SUMMON_TINT,
  colourEnd: [0.5, 0.2, 0.08],
  size: 0.16,
  sizeJitter: 0.4,
  life: 0.9,
  lifeJitter: 0.3,
  box: [1.1, 0.05, 1.1],
  dir1: [-0.15, 1, -0.15],
  dir2: [0.15, 1, 0.15],
  power: 1.1,
  powerJitter: 0.4,
  gravity: -0.3,
  endScale: 0.3,
  capacity: 64,
};

/**
 * The circle's secondary detail at the caster's feet: a warm pool on the ground that opens with the
 * decal, embers lifting off it, and its light; a second light on the chest where the streaks meet (from
 * their 9th tick to the last one's death, 20 + 13 ticks after the circle opens).
 */
const summonGrace: Step = (feet, c) => {
  if (entityGone(c.caster)) return;
  const chest: PointSource = out => entityPos(c.caster, HEALING_HEIGHT, out);
  effects.spawn('sprite', c.scene, feet, { texture: TEX.flare, colour: scaleRGB(SUMMON_TINT, 0.4), size: 3.4, growFrom: 0.2, seconds: ticks(24), fadeTail: 0.4, flat: true, height: 0.04 });
  effects.spawn('particles', c.scene, feet, { recipe: SUMMON_EMBERS, rate: 40, seconds: ticks(20), height: 0.05 });
  delay(ticks(9), () => {
    if (entityGone(c.caster)) return;
    summonLight(c.scene, SUMMON_TINT, 0.7, ticks(24), chest(new Vector3()), chest, { attack: ticks(4), release: ticks(10), gain: 0.6 });
  });
  // The decal is 2.85 tiles across at its widest: its light grows with it and dims over the last ticks.
  summonLight(c.scene, SUMMON_TINT, 1.45, ticks(20), feet, undefined, { attack: ticks(10), release: ticks(6), heightOffset: 0.4, floorGain: 0.4 });
};

const elfSummonGraded: Step = afterRelease(atCaster(seq(summonDecal, createHealing(SUMMON_STREAK_TINT, 20, SUMMON_GRACE_STREAK), summonGrace), 0));
export const SUMMON_GRADED = { area: elfSummonGraded, impact: elfSummonGraded };
