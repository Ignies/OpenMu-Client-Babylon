import { defineSkill } from '@/controllers/skills/define';
import { DECAY_SMOKE, decay, decayCometWith, decayOf } from '../../_shared';
import { LANDING_SMOKE_LIFT_GRADED, dw2AtAttackTime, smallerSmoke } from '../_shared';
import { type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { particles, ring, seq } from '@/controllers/skills/visuals';

import { EFFECT_LUMINOSITY, SkillLight } from '@/controllers/lighting/skills';
import { EXPLOSION_LIGHT } from '../_shared';
import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

const DECAY_SMOKE_GRADED = smallerSmoke(DECAY_SMOKE);

/** Decay's poison green, the comet's flames and the landing's tint. */
const DECAY_GREEN: RGB = [0.3, 1, 0.2];
/** Green sparks the comet sheds as it falls. */
const DECAY_SHED: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.5, 1, 0.3],
  colourEnd: [0.05, 0.4, 0],
  size: 0.18,
  sizeJitter: 0.4,
  life: 0.6,
  box: [0.15, 0.15, 0.15],
  power: 0.6,
  gravity: -1.5,
  capacity: 256,
};
/** The poison cloud left lying low where a comet lands; lifted so its cards clear the ground, which cut them square. */
const DECAY_MIST_LIFT = 0.9;
const DECAY_MIST: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.12, 0.4, 0.08],
  colourEnd: [0, 0.1, 0],
  size: 0.8,
  sizeJitter: 0.3,
  life: 1.8,
  lifeJitter: 0.4,
  box: [0.7, 0.1, 0.7],
  dir1: [-0.5, 0.05, -0.5],
  dir2: [0.5, 0.3, 0.5],
  power: 0.4,
  gravity: 0.1,
  endScale: 1.6,
  spin: 0.5,
  blend: 'add',
  capacity: 128,
};
/** Green drops the landing splashes up. */
const DECAY_SPLASH: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.6, 1, 0.35],
  colourEnd: [0.1, 0.45, 0],
  size: 0.22,
  sizeJitter: 0.4,
  life: 0.8,
  box: [0.2, 0.05, 0.2],
  dir1: [-1.3, 0.8, -1.3],
  dir2: [1.3, 2.2, 1.3],
  power: 3,
  gravity: -5,
  capacity: 256,
};

/** Enhanced Decay: a green glow and shed sparks on each comet; the landing adds a green shock ring, a lingering poison cloud and a splash. */
const decayGraded = decayOf(
  decayCometWith({
    flight: (head, seconds, c) => {
      effects.spawn('sprite', c.scene, head(new Vector3()), { texture: TEX.flare, colour: DECAY_GREEN, size: 1.4, seconds, follow: head, fadeTail: 0.05 });
      effects.spawn('particles', c.scene, head(new Vector3()), { recipe: DECAY_SHED, rate: 50, seconds, follow: head });
    },
    land: seq(
      ring({ texture: TEX.shockwave, colour: [0.4, 1, 0.3], scale: 3.6, growFrom: 0.3, grow: 1, seconds: 0.6, fadeTail: 0.5 }),
      particles({ recipe: DECAY_MIST, count: 8, height: DECAY_MIST_LIFT }),
      particles({ recipe: DECAY_SPLASH, count: 24 })
    ),
  }, DECAY_SMOKE_GRADED, LANDING_SMOKE_LIFT_GRADED)
);

// Decay (387 too): each comet's (0.1, 1, 0) x Luminosity range 2 while it falls (ZzzEffect.cpp:7939-7945), then its
// green-tinted explosion's usual warm light.
export const DECAY_LIGHT: SkillLight = {
  spots: {
    comet: { color: [0.1, 1, 0], range: 2, seconds: 40 * TICK_SECONDS, release: TICK_SECONDS, flicker: EFFECT_LUMINOSITY },
    blast: EXPLOSION_LIGHT,
  },
  // Enhanced: the comet carries its green glow down, and the landing lights green as its tinted explosion and ring reach.
  enhanced: {
    spots: {
      comet: effectLight([0.3, 1, 0.15], 1, 40 * TICK_SECONDS, { release: TICK_SECONDS, flicker: EFFECT_LUMINOSITY }),
      blast: effectLight([0.35, 1, 0.3], 1.8, 20 * TICK_SECONDS, { release: 16 * TICK_SECONDS }),
    },
  },
};

export default defineSkill({
  id: 38,
  name: "Decay",
  // 38 Decay (387 aliases here): 2x MODEL_FIRE sub6 on the cast point at AttackTime 15 (`decay`); Enhanced `decayGraded`.
  visual: { area: dw2AtAttackTime(decay), enhanced: { area: dw2AtAttackTime(decayGraded) } },
  light: DECAY_LIGHT,
});
