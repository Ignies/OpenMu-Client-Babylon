import { defineSkill } from '@/controllers/skills/define';
import { DUST, TEX } from '@/controllers/fx/recipes';
import { type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { Step, seq } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { comet, cometWith } from '../../_shared';
import { dw2AtAttackTime } from '../_shared';
import { effects } from '@/controllers/fx';

import { EFFECT_LUMINOSITY, SkillLight } from '@/controllers/lighting/skills';
import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

/** Cometfall at AttackTime 15 on the cast point: two comets made the same tick (ZzzCharacter.cpp:4556-4572). No cast sound. */
const cometfall: Step = seq(comet, comet);

/** The comet's glow as it reads: the light's blue leaning to the trail's violet. flare01, not flareBlue: its streaks reach the quad's edge. */
const COMET_GLOW: RGB = [0.4, 0.48, 1];
/** Sparks the comet sheds as it falls: violet-blue, dropping behind it. */
const COMET_SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.6, 0.5, 1],
  colourEnd: [0.3, 0.1, 0.9],
  size: 0.2,
  sizeJitter: 0.35,
  life: 0.5,
  box: [0.12, 0.12, 0.12],
  power: 0.8,
  gravity: -1.5,
  capacity: 256,
};
/** Chips of light the landing throws up: white going blue. */
const COMET_IMPACT_SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.85, 0.9, 1],
  colourEnd: [0.35, 0.4, 1],
  size: 0.26,
  sizeJitter: 0.35,
  life: 0.8,
  box: [0.2, 0.05, 0.2],
  dir1: [-1.4, 0.8, -1.4],
  dir2: [1.4, 2, 1.4],
  power: 3.2,
  gravity: -5,
  capacity: 256,
};

/** Enhanced Cometfall: a blue head glow and shed sparks on each comet; the landing adds a shock ring, dust and a spray of sparks. */
const cometGraded = cometWith({
  flight: (head, seconds, c) => {
    effects.spawn('sprite', c.scene, head(new Vector3()), { texture: TEX.flare, colour: COMET_GLOW, size: 1.8, seconds, follow: head, fadeTail: 0.05 });
    effects.spawn('particles', c.scene, head(new Vector3()), { recipe: COMET_SPARKS, rate: 60, seconds, follow: head });
  },
  land: (p, c) => {
    effects.spawn('ring', c.scene, p, { texture: TEX.shockwave, colour: [0.9, 1, 1.6], scale: 2.6, growFrom: 0.4, grow: 1.6, seconds: 0.7, fadeTail: 0.4 });
    effects.spawn('particles', c.scene, p, { recipe: DUST, count: 8 });
    effects.spawn('particles', c.scene, p, { recipe: COMET_IMPACT_SPARKS, count: 28 });
  },
});
const cometfallGraded: Step = seq(cometGraded, cometGraded);

export const COMETFALL_LIGHT: SkillLight = {
  spots: {
    comet: { color: [0.2, 0.4, 1], range: 2, seconds: 30 * TICK_SECONDS, release: TICK_SECONDS, flicker: EFFECT_LUMINOSITY },
    blast: { color: [0.5, 0.3, 0.1], range: 4, seconds: 20 * TICK_SECONDS, release: 20 * TICK_SECONDS },
  },
  // Enhanced: the comet carries its blue glow down (the trail's violet read pink on sand), and the landing lights as its warm explosion and ring reach.
  enhanced: {
    spots: {
      comet: effectLight([0.3, 0.42, 1], 1, 30 * TICK_SECONDS, { release: TICK_SECONDS, flicker: EFFECT_LUMINOSITY }),
      blast: effectLight([1, 0.72, 0.4], 1.8, 20 * TICK_SECONDS, { release: 16 * TICK_SECONDS }),
    },
  },
};

export default defineSkill({
  id: 13,
  name: "Cometfall",
  // 13 Cometfall (382 / 484 alias here): 2x MODEL_SKILL_BLAST on the cast point at AttackTime 15 (`cometfall`); Enhanced `cometfallGraded`.
  visual: { area: dw2AtAttackTime(cometfall), enhanced: { area: dw2AtAttackTime(cometfallGraded) } },
  // Cometfall (382 / 484 too): each comet's (0.2, 0.4, 1) range 2 while it falls (MoveHandlers.cpp:2576-2577),
  // then its BITMAP_EXPLOTION's (0.5, 0.3, 0.1) range 4 fading over 20 ticks (ZzzEffectParticle.cpp:4265-4269).
  light: COMETFALL_LIGHT,
});
