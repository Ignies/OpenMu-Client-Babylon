import { defineSkill } from '@/controllers/skills/define';
import { FIRE_SPARKS, RGBS, TEX } from '@/controllers/fx/recipes';
import { FIRE_BALL_EMBERS, FireBallLook, atRelease, fireBallFlight, groundFlare, lavaChips, perTickRoll, placeBodyLight, releaseSound, softExplosion } from '../_shared';
import { type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { Step, burn, cm, explosion, particles, ring, scorch, sprite } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { playCombat } from '@/controllers/sound/combat';

import { FIRE_BALL_LIGHT } from '../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

/** The meteor's blast on the graded tiers: BITMAP_FIRE rolled out flat from the landing and rising as it burns off. */
const METEOR_BLAST: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: [1, 0.5, 0.15],
  colourEnd: [0.6, 0.08, 0],
  size: 0.7,
  sizeJitter: 0.3,
  life: 0.55,
  lifeJitter: 0.3,
  box: [0.15, 0.05, 0.15],
  dir1: [-1, 0.1, -1],
  dir2: [1, 0.45, 1],
  power: 2.6,
  settle: 0.5,
  gravity: 0.8,
  spin: 2,
  endScale: 1.8,
};

/** Dust and smoke the landing throws up: straight-alpha matter, so it darkens what it covers and never blooms. */
const METEOR_DUST: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  softEdge: true,
  colour: [0.26, 0.23, 0.2],
  size: 0.8,
  sizeJitter: 0.3,
  life: 1.5,
  lifeJitter: 0.25,
  box: [0.35, 0.05, 0.35],
  dir1: [-0.5, 0.4, -0.5],
  dir2: [0.5, 1, 0.5],
  power: 0.9,
  settle: 0.4,
  gravity: 0.35,
  spin: 0.6,
  endScale: 2.6,
  fade: [
    [0, 0],
    [0.15, 0.7],
    [1, 0],
  ],
  blend: 'alpha',
};

/**
 * 2 Meteorite (ZzzCharacter.cpp:5007-5010): MODEL_FIRE sub0 from 130-161 cm along +x and 400 cm over the
 * target's feet, Scale 1.0-1.7, falling 50 cm a tick tilted 20 deg back onto them (ZzzEffect.cpp:2546-2556),
 * the tail flickering at 0.4-0.7. On the ground (:7808-7858) `landing` runs at the feet.
 */
const meteor = (landing: Step, look?: FireBallLook): Step =>
  atRelease((feet, c) => {
    releaseSound('Sound/eMeteorite')(feet, c);
    const from = new Vector3(feet.x + cm(130 + Math.random() * 32), feet.y + cm(400), feet.z);
    fireBallFlight(c, 2, from, feet, { scale: 1 + Math.random() * 0.7, tail: perTickRoll(0.4, 4, 0.1), alongPath: true, ...look }, p => landing(p, c));
  });

/** The meteor's landing: 6 chips and one untinted BITMAP_EXPLOTION 80 cm up, which plays SOUND_EXPLOTION01 (ZzzEffectParticle.cpp:2466-2485). */
const meteorLanding = (tint: RGB = RGBS.white): Step => (p, c) => {
  explosion(tint)(new Vector3(p.x, p.y + cm(80), p.z), c);
  lavaChips(6)(p, c);
  playCombat('Sound/eExplosion', p);
};

/** The meteor's glow card and embers in flight. */
const METEOR_LOOK: FireBallLook = { glow: { texture: TEX.flare, colour: [1, 0.45, 0.12], size: 1.5, spin: 3 }, embers: FIRE_BALL_EMBERS };

/**
 * The meteor landing on the graded tiers: the same explosion 80 cm up (warm, soft-edged) and 6 chips, over a
 * white-hot flash, a shock ring and a glowing crater, a flat roll of fire, sparks and the dust it throws up.
 */
const meteorImpact: Step = (p, c) => {
  const up = new Vector3(p.x, p.y + cm(80), p.z);
  softExplosion([0.95, 0.55, 0.25])(up, c);
  sprite({ texture: TEX.flare, colour: [1, 0.72, 0.45], size: 1.4, seconds: 0.25, growFrom: 0.5, grow: 1.4, fadeTail: 0.7 })(up, c);
  ring({ texture: TEX.shockwave, colour: [1, 0.5, 0.15], scale: 1.2, grow: 2.4, growFrom: 0.4, seconds: 0.45, fadeTail: 0.7 })(p, c);
  groundFlare([1, 0.32, 0.06], 2.2, 1.4)(p, c);
  particles({ recipe: METEOR_BLAST, count: 10, height: 0.15 })(p, c);
  particles({ recipe: FIRE_SPARKS, count: 18, height: 0.3 })(p, c);
  particles({ recipe: METEOR_DUST, count: 8, height: 0.1 })(p, c);
  lavaChips(6)(p, c);
  playCombat('Sound/eExplosion', p);
  placeBodyLight(2, 'impact')(p, c);
  placeBodyLight(2, 'crater')(p, c);
  scorch(1.2)(p, c);
  burn(1.2)(p, c);
};

export default defineSkill({
  id: 2,
  name: "Meteorite",
  // 2 Meteorite: at the release, MODEL_FIRE sub0 falls on the target's feet; 6 chips and the explosion (meteor).
  // Enhanced: the same fall with a glow and embers, and a fuller landing (meteorImpact).
  visual: {
    impact: meteor(meteorLanding()),
    enhanced: { impact: meteor(meteorImpact, METEOR_LOOK) },
  },
  // Meteorite: MODEL_FIRE's `(Lum, 0.1 Lum, 0)` range 2 rides the ball down and dies with it (ZzzEffect.cpp:7948-7953).
  // Enhanced: an orange glow riding the lit ball; on the ground the white-hot burst over the explosion's reach
  // and the crater's red, which outlasts it.
  light: {
    land: FIRE_BALL_LIGHT,
    enhanced: {
      land: effectLight([1, 0.4, 0.1], 1.2, 3, { release: 0.04, flicker: { min: 0.8, max: 1, steps: 4 } }),
      bodies: {
        impact: effectLight([1, 0.6, 0.25], 1.8, 0.7, { heightOffset: 0.8, release: 0.45 }),
        crater: effectLight([1, 0.3, 0.06], 1.1, 1.4, { attack: 0.1, release: 0.8, flicker: { min: 0.75, max: 1, steps: 4 } }),
      },
    },
  },
});
