import { defineSkill } from '@/controllers/skills/define';
import { BODY_SMOKE, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Step, after, particles, ring, seq, ticks } from '@/controllers/skills/visuals';
import { atRelease, groundFlare, releaseSound } from '../_shared';
import { delay, entityYaw, type ParticleRecipe } from '@/controllers/fx/core';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

import { type LightRecipe } from '@/controllers/lighting/lightSource';
import { effectLight } from '@/controllers/lighting/recipes';

/**
 * BITMAP_SMOKE sub0 as MODEL_ICE and its shards leave it (ZzzEffect.cpp:7644-7651, MoveHandlers.cpp:3978):
 * BODY_SMOKE with the original's fixed rotation and `Light = LT/8`, full for 8 ticks, then to black.
 */
const ICE_SHARD_SMOKE: ParticleRecipe = {
  ...BODY_SMOKE,
  colour: [1, 1, 1],
  colourEnd: [1, 1, 1],
  spin: 0,
  fade: [
    [0, 1],
    [0.5, 1],
    [1, 0],
  ],
};

/** The crystal's puffs: +-32 cm across, 32-159 cm up (ZzzEffect.cpp:7645-7648), about a 0.96 tile centre. */
const ICE_SMOKE: ParticleRecipe = {
  ...ICE_SHARD_SMOKE,
  box: [0.32, 0.635, 0.32],
};

/** Frost glints on and around the Ice crystal: tiny cold flares that twinkle out. */
const FROST_GLINTS: ParticleRecipe = {
  texture: TEX.shiny,
  colour: [0.75, 0.9, 1],
  size: 0.2,
  sizeJitter: 0.4,
  life: 0.6,
  lifeJitter: 0.4,
  box: [0.4, 0.55, 0.4],
  power: 0.15,
  gravity: -0.3,
  spin: 3,
  fade: [
    [0, 0],
    [0.3, 1],
    [1, 0],
  ],
};

/** The cold breath rolling off the crystal's base: smoke01 in ice blue, pushed out along the ground. */
const ICE_MIST: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.22, 0.4, 0.68],
  size: 0.7,
  sizeJitter: 0.3,
  life: 1.1,
  lifeJitter: 0.2,
  box: [0.25, 0.04, 0.25],
  dir1: [-1, 0, -1],
  dir2: [1, 0.15, 1],
  power: 1.4,
  settle: 0.35,
  gravity: 0.05,
  spin: 0.5,
  endScale: 2.4,
  fade: [
    [0, 0],
    [0.15, 1],
    [1, 0],
  ],
  blend: 'add',
};

/**
 * 7 Ice (ZzzCharacter.cpp:4955-4969): MODEL_ICE at the target's feet, Scale 0.8, Light (1, 1, 1), its only
 * mesh the additive blend mesh, clip at 1 key a tick held at key 5; from then a BITMAP_SMOKE one tick in two,
 * and it pops out when `Alpha -= 0.05` crosses 0, about 25 ticks in (ZzzEffect.cpp:2187-2195, :7637-7661).
 * 5 MODEL_ICE_SMALL thrown from 50 cm up at BlendMeshLight 0.3 (ZzzEffect.cpp:2719-2790). SOUND_ICE.
 */
const iceCrystal = (extra?: Step): Step =>
  atRelease((feet, c) => {
    effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(25), scale: 0.8, colour: RGBS.white, yaw: entityYaw(c.caster), keysPerTick: 1, playTo: 5, fadeTail: 0.04 });
    const smokeAt = feet.clone();
    delay(ticks(5), () => effects.spawn('particles', c.scene, smokeAt, { recipe: ICE_SMOKE, rate: 12.5, seconds: ticks(20), height: 0.955 }));
    effects.spawn('debris', c.scene, feet, { model: MODEL.ice2, count: 5, colour: [0.3, 0.3, 0.3], liftCm: 50, puff: ICE_SHARD_SMOKE });
    releaseSound('Sound/sIce')(feet, c);
    lighting.skillLand(c.scene, 7, feet);
    extra?.(feet, c);
  });

/** Ice on the graded tiers: the same crystal over a frost ring and glow on the ground, cold mist rolling out and glints. */
const iceImproved: Step = seq(
  ring({ texture: TEX.shockwave, colour: [0.45, 0.7, 1], scale: 0.8, grow: 2.6, growFrom: 0.4, seconds: 0.4, fadeTail: 0.7 }),
  groundFlare([0.35, 0.6, 1], 2, ticks(25)),
  particles({ recipe: ICE_MIST, count: 8, height: 0.08 }),
  after(ticks(3), particles({ recipe: FROST_GLINTS, rate: 20, seconds: ticks(20), height: 0.6 }))
);

/**
 * MODEL_ICE sub0's negative light, for the crystal's 25 ticks. Scaled into linear light the way the
 * negative monster lights are (controllers/lighting/characters.ts DARK_FLOOR_GAIN).
 */
const ICE_LIGHT: LightRecipe = {
  color: [-0.4, -0.3, -0.2],
  range: 2,
  pointRange: 2,
  seconds: 25 * 0.04,
  release: 0.04,
  gain: 0.35,
  floorGain: 0.35,
  flicker: { min: 0.7, max: 1, steps: 4 },
};

export default defineSkill({
  id: 7,
  name: "Ice",
  // ReceiveMagicFinish drops eDeBuff_Freeze (WSclient.cpp:3890-3894).
  effect: 56,
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [389],
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [489, 491],
  // 7 Ice: at the release, MODEL_ICE + 5 MODEL_ICE_SMALL at the target's feet (iceCrystal). Enhanced: frost on the ground, mist and glints.
  visual: { impact: iceCrystal(), enhanced: { impact: iceCrystal(iceImproved) } },
  // Ice: MODEL_ICE takes `(0.4, 0.3, 0.2) x Lum` off the ground, range 2, while the crystal stands (ZzzEffect.cpp:7658-7660).
  // Enhanced: the crystal is bright additive art, so it lights the ground its ice blue while it stands.
  light: { land: ICE_LIGHT, enhanced: { land: effectLight([0.55, 0.8, 1], 1.1, 1, { release: 0.15, flicker: { min: 0.85, max: 1, steps: 4 } }) } },
});
