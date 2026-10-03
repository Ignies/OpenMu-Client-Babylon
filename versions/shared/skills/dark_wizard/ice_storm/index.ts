import { defineSkill } from '@/controllers/skills/define';
import { BODY_SMOKE, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { LANDING_SMOKE_LIFT, dw2Sfx, groundAt, landingSmoke, lightAt } from '../../_shared';
import { LANDING_SMOKE_LIFT_GRADED, dw2AtAttackTime, smallerSmoke } from '../_shared';
import { delay, entityYaw, fxNow, lerp, type ParticleRecipe, type PointSource } from '@/controllers/fx/core';
import { SkillContext, Step, TICK, cm, particles, ring, seq, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

import { SkillLight } from '@/controllers/lighting/skills';
import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

/** MODEL_BLIZZARD sub0 (ZzzEffect.cpp:3098-3121): ten shards, Scale 0.5, LT 15-29, Gravity -30..-59 cm a tick. */
const ICE_SHARDS = 10;
/** Every tick: `o->Light += 0.1` from 0, the brightness of the shard and its two sprites (MoveHandlers.cpp:5157-5162). */
const ICE_RAMP_TICKS = 10;
/** Landing: MODEL_BLIZZARD sub1, LT 20, Scale 0.9, BlendMeshLight / 1.1 a tick (ZzzEffect.cpp:3123-3128, MoveHandlers.cpp:5178-5186). */
const ICE_REST_TICKS = 20;
/** BITMAP_ENERGY sub1 at Scale 0.5: Thunder01 at 0.3-0.65 (64 px), LT 10, Light LT/15, +20 deg and +0.1 Scale a tick (ZzzEffectParticle.cpp:723-731, :4939-4946). */
const ICE_CHIPS: ParticleRecipe = {
  texture: TEX.thunder,
  colour: [0.67, 0.67, 0.67],
  colourEnd: [0, 0, 0],
  size: 0.3,
  sizeJitter: 0.35,
  life: ticks(10),
  power: 0,
  gravity: 0,
  spin: 8.7,
  endScale: 3.1,
  blend: 'add',
  capacity: 128,
};
/** BITMAP_FIRE+2 sub7 at the shard's Scale: Fire03 cells of 0.97-1.3 tiles, LT 24, Scale -0.04 a tick, white fading LT/24 (ZzzEffectParticle.cpp:416-422, :4563-4571). */
const ICE_FLAME: ParticleRecipe = {
  texture: TEX.fire3,
  cells: { w: 64, h: 64, count: 4 },
  colour: RGBS.white,
  colourEnd: [0, 0, 0],
  size: 1.13,
  sizeJitter: 0.15,
  life: ticks(24),
  power: 0,
  gravity: 0.1,
  endScale: 0.46,
  blend: 'add',
  capacity: 128,
};
/** The blue landing cloud: BITMAP_SMOKE sub11 at (0.24, 0.28, 0.8) (MoveHandlers.cpp:5167-5171). */
const ICE_STORM_MIST = landingSmoke([0.24, 0.28, 0.8]);

/** What the graded tiers add to Ice Storm: on each shard's flight, where each lands, and once on the cast point. */
interface IceExtra {
  flight: (shard: PointSource, seconds: number, fadeIn: number, c: SkillContext) => void;
  land: Step;
  storm: Step;
  /** The landing cloud in place of ICE_STORM_MIST, and its lift. */
  mist: { recipe: ParticleRecipe; height: number };
}

/**
 * Shard `i` of Ice Storm (MoveHandlers.cpp:5140-5176). Its flight is rolled tick by tick up front as the original
 * moves it: +-10 cm shake round a start that drifts -10 cm a tick in x, falling by a Gravity that grows 0-4 cm a
 * tick. It lands when it passes below the terrain, or dies in the air when its LT runs out first.
 */
const iceShard = (i: number, extra?: IceExtra): Step => (at, c) => {
  const lifeTicks = 15 + Math.floor(Math.random() * 15);
  let sx = at.x + cm(Math.floor(Math.random() * 300) - 150 + 100);
  const sz = at.z + cm(Math.floor(Math.random() * 300) - 150);
  let y = at.y + cm(600 + Math.floor(Math.random() * 50) * i);
  let gravity = -20 - (Math.floor(Math.random() * 30) + 10);
  const path = new Float32Array((lifeTicks + 1) * 3);
  path[0] = sx;
  path[1] = y;
  path[2] = sz;
  let n = 0;
  let landed = false;
  while (n < lifeTicks && !landed) {
    n++;
    const x = sx + Math.sin(Math.floor(Math.random() * 1000) * 0.01) * cm(10);
    const z = sz + Math.sin(Math.floor(Math.random() * 1000) * 0.01) * cm(10);
    y += cm(gravity);
    gravity -= Math.floor(Math.random() * 5);
    sx -= cm(10);
    path[n * 3] = x;
    path[n * 3 + 1] = y;
    path[n * 3 + 2] = z;
    landed = y < groundAt(x, z, at.y);
  }
  const last = n;
  const seconds = last * TICK;
  const t0 = fxNow();
  const shard: PointSource = out => {
    const k = Math.min(last, (fxNow() - t0) / TICK);
    const a = Math.floor(k);
    const b = Math.min(last, a + 1);
    const f = k - a;
    return out.set(lerp(path[a * 3], path[b * 3], f), lerp(path[a * 3 + 1], path[b * 3 + 1], f), lerp(path[a * 3 + 2], path[b * 3 + 2], f));
  };
  const from = new Vector3(path[0], path[1], path[2]);
  const yaw = entityYaw(c.caster);
  const fadeIn = Math.min(1, ICE_RAMP_TICKS / last);
  effects.spawn('model', c.scene, from, { model: MODEL.blizzard, seconds, scale: 0.5, colour: RGBS.white, yaw, follow: shard, life: q => Math.min(1, (q * last) / ICE_RAMP_TICKS) });
  // Each tick a white SMOKE sub0 puff, and at even odds an ENERGY sub1 chip or a FIRE+2 sub7 flame (MoveHandlers.cpp:5148-5156).
  effects.spawn('particles', c.scene, from, { recipe: BODY_SMOKE, rate: 25, seconds, follow: shard });
  effects.spawn('particles', c.scene, from, { recipe: ICE_CHIPS, rate: 12.5, seconds, follow: shard });
  effects.spawn('particles', c.scene, from, { recipe: ICE_FLAME, rate: 12.5, seconds, follow: shard });
  // SHINY+1 at Scale 0.8-1.4 and BITMAP_LIGHT at 1, both at the shard's climbing Light and a random turn each tick.
  effects.spawn('sprite', c.scene, from, { texture: TEX.shiny2, size: cm(32), aspect: 2, seconds, follow: shard, fadeIn, fadeTail: 0.01, reroll: { every: TICK, size: [0.8, 1.4] } });
  effects.spawn('sprite', c.scene, from, { texture: TEX.flare, size: cm(64), seconds, follow: shard, fadeIn, fadeTail: 0.01, reroll: { every: TICK } });
  extra?.flight(shard, seconds, fadeIn, c);
  if (!landed) return;
  delay(seconds, () => {
    const p = new Vector3(path[last * 3], path[last * 3 + 1] + cm(50), path[last * 3 + 2]);
    particles({ recipe: extra?.mist.recipe ?? ICE_STORM_MIST, count: 1, height: extra?.mist.height ?? LANDING_SMOKE_LIFT })(p, c);
    if (Math.random() < 0.2) effects.spawn('debris', c.scene, p, { model: MODEL.ice2, colour: RGBS.white, liftCm: 50 });
    effects.spawn('model', c.scene, p, { model: MODEL.blizzard, seconds: ticks(ICE_REST_TICKS), scale: 0.9, colour: RGBS.white, yaw, life: q => Math.pow(1.1, -ICE_REST_TICKS * q) });
    // SOUND_SUDDEN_ICE2 when shard 0's (PKKey 1) resting blizzard reaches LT 18.
    if (i === 0) delay(ticks(2), () => dw2Sfx('Sound/eSuddenIce_2', p));
    extra?.land(p, c);
  });
};

/** Ice Storm at AttackTime 15 on the cast point: ten shards and SOUND_SUDDEN_ICE1 (ZzzCharacter.cpp:4456-4477). No light. */
const iceStormWith = (extra?: IceExtra): Step => (at, c) => {
  for (let i = 0; i < ICE_SHARDS; i++) iceShard(i, extra)(at, c);
  dw2Sfx('Sound/eSuddenIce_1', at);
  extra?.storm(at, c);
};
const iceStorm = iceStormWith();
const ICE_STORM_MIST_GRADED = smallerSmoke(ICE_STORM_MIST);

/** Frost glints shed by each falling shard. */
const ICE_GLINTS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.75, 0.9, 1],
  colourEnd: [0.2, 0.4, 1],
  size: 0.12,
  sizeJitter: 0.4,
  life: 0.5,
  box: [0.15, 0.15, 0.15],
  power: 0.3,
  gravity: -0.5,
  capacity: 512,
};
/** Ice chips a landing shard shatters into. */
const ICE_SHATTER: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.85, 0.95, 1],
  colourEnd: [0.3, 0.5, 1],
  size: 0.16,
  sizeJitter: 0.4,
  life: 0.7,
  box: [0.15, 0.05, 0.15],
  dir1: [-1.2, 1, -1.2],
  dir2: [1.2, 2.4, 1.2],
  power: 2.6,
  gravity: -6,
  capacity: 256,
};

/** Enhanced Ice Storm: a frost glow and glints on each shard, a frost ring and shatter where each lands, and the storm's light. */
const iceStormGraded = iceStormWith({
  flight: (shard, seconds, fadeIn, c) => {
    effects.spawn('sprite', c.scene, shard(new Vector3()), { texture: TEX.flare, colour: [0.35, 0.6, 1], size: 1, seconds, follow: shard, fadeIn, fadeTail: 0.05 });
    effects.spawn('particles', c.scene, shard(new Vector3()), { recipe: ICE_GLINTS, rate: 30, seconds, follow: shard });
  },
  land: seq(ring({ texture: TEX.shockwave, colour: [0.55, 0.75, 1], scale: 1.8, growFrom: 0.3, grow: 1, seconds: 0.5, fadeTail: 0.5 }), particles({ recipe: ICE_SHATTER, count: 12 })),
  storm: (at, c) => {
    lighting.skillSpot(c.scene, 39, 'storm', lightAt(at));
  },
  mist: { recipe: ICE_STORM_MIST_GRADED, height: LANDING_SMOKE_LIFT_GRADED },
});

export const ICE_STORM_LIGHT: SkillLight = {
  enhanced: { spots: { storm: effectLight([0.45, 0.7, 1], 2, 50 * TICK_SECONDS, { release: 20 * TICK_SECONDS }) } },
};

export default defineSkill({
  id: 39,
  name: "Ice Storm",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [391, 393],
  // 39 Ice Storm (391 / 393 alias here): 10x MODEL_BLIZZARD sub0 on the cast point at AttackTime 15 (`iceStorm`); Enhanced `iceStormGraded`.
  visual: { area: dw2AtAttackTime(iceStorm), enhanced: { area: dw2AtAttackTime(iceStormGraded) } },
  // Ice Storm (391 / 393 too): MODEL_BLIZZARD lights nothing (MoveHandlers.cpp:5134-5189). The empty row keeps the
  // wizardry cast flash off. Enhanced: one frost light over the shards' 2-tile fall, through their landing.
  light: ICE_STORM_LIGHT,
});
