import { defineSkill } from '@/controllers/skills/define';
import { HIT_SPARKS, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { entityPos, entityYaw, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { heroSkillEffect, type ModelOptions } from '@/controllers/fx/model';
import { Step, burn, cm, explosion, particles, ring, scorch, seq, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { dw2AtAttackTime } from '../_shared';
import { dw2Sfx, dw2Stone, lightAt } from '../../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

import { A } from '@/controllers/combat/recipes';

import { EFFECT_LUMINOSITY, SkillLight } from '@/controllers/lighting/skills';
import { EXPLOSION_LIGHT } from '../_shared';
import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

// dw2 batch 2: Inferno, Decay, Ice Storm.

/** CreateInferno: 8 CreateBomb 220 cm round the caster, (0, -220) turned j * 45 deg (ZzzEffect.cpp:6435-6476). */
const INFERNO_BOMBS = 8;
const INFERNO_RADIUS = cm(220);
/** MODEL_SKILL_INFERNO sub0: LT 15, Scale 0.9, Light 0.8, clip Velocity 0.5, BlendMeshLight LT/20 (ZzzEffect.cpp:1378-1389, MoveHandlers.cpp:2675-2678). */
const INFERNO_TICKS = 15;
/** CreateBomb 80 cm up: 20 BITMAP_SPARK sub2 and a BITMAP_EXPLOTION at (0.7, 0.7, 0.7) (ZzzEffect.cpp:6275-6347). */
const BOMB_LIFT = cm(80);
const BOMB_TINT: RGB = [0.7, 0.7, 0.7];
/** BITMAP_SPARK sub2: the sub0 Spark02 grain at Scale x2, thrown 3x as far sideways (ZzzEffectParticle.cpp:2016-2031). */
const BOMB_GRAINS: ParticleRecipe = { ...HIT_SPARKS, size: 0.044, dir1: [-3, 1.5, -3], dir2: [3, 5.5, 3] };

/** What the graded tiers add to Inferno: at each bomb (its ground point), and once at the caster. */
interface InfernoExtra {
  bomb: Step;
  centre: Step;
}

/**
 * Inferno at AttackTime 15 (ZzzCharacter.cpp:4573-4577): the eight bombs, each with a stone going straight up
 * (SubType 1) and one thrown (SubType 0), then Inferno01 at the caster. No cast sound: the eight explosions play
 * SOUND_EXPLOTION01 on its one channel, one burst.
 */
const infernoWith = (tint: RGB, extra?: InfernoExtra): Step => (_at, c) => {
  const centre = entityPos(c.caster, 0, new Vector3());
  for (let j = 0; j < INFERNO_BOMBS; j++) {
    const a = (j * Math.PI * 2) / INFERNO_BOMBS;
    // At the caster's height, as the original: CreateBomb never reads the terrain.
    const p = new Vector3(centre.x + Math.sin(a) * INFERNO_RADIUS, centre.y, centre.z - Math.cos(a) * INFERNO_RADIUS);
    const up = new Vector3(p.x, p.y + BOMB_LIFT, p.z);
    particles({ recipe: BOMB_GRAINS, count: 20 })(up, c);
    explosion(tint)(up, c);
    effects.spawn('debris', c.scene, p, { model: dw2Stone(), colour: RGBS.white, still: true });
    effects.spawn('debris', c.scene, p, { model: dw2Stone(), colour: RGBS.white });
    lighting.skillSpot(c.scene, 14, 'blast', lightAt(p));
    extra?.bomb(p, c);
  }
  const ring: ModelOptions = {
    model: MODEL.inferno,
    seconds: ticks(INFERNO_TICKS),
    scale: 0.9,
    colour: [0.8, 0.8, 0.8],
    yaw: -entityYaw(c.caster),
    keysPerTick: 0.5,
    life: p => (INFERNO_TICKS * (1 - p)) / 20,
  };
  effects.spawn('model', c.scene, centre, heroSkillEffect(ring, c.caster));
  lighting.skillSpot(c.scene, 14, 'inferno', lightAt(centre));
  dw2Sfx('Sound/eExplosion', centre);
  extra?.centre(centre, c);
};
const inferno = infernoWith(BOMB_TINT);

// dw2 batch 2 on the graded tiers: the same effects, with fire, poison and frost detail and ground contact that read after the tone curve.

/** Eight grey (0.7) explosions summed to a cream-white blob on the graded buffer; leaning the tint to the sheet's own orange keeps each one a fireball. */
const BOMB_TINT_GRADED: RGB = [0.55, 0.4, 0.25];
/** Fire tongues licking up out of each bomb. */
const INFERNO_TONGUES: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: [1, 0.55, 0.2],
  colourEnd: [0.35, 0.08, 0],
  size: 0.85,
  sizeJitter: 0.3,
  life: 0.55,
  lifeJitter: 0.2,
  box: [0.35, 0.1, 0.35],
  dir1: [-0.3, 1, -0.3],
  dir2: [0.3, 1.6, 0.3],
  power: 1.8,
  gravity: 1.2,
  endScale: 1.8,
  spin: 2,
  blend: 'add',
  capacity: 256,
};
/** Embers drifting up off the bombs after the blast. */
const INFERNO_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [1, 0.6, 0.2],
  colourEnd: [0.6, 0.12, 0],
  size: 0.12,
  sizeJitter: 0.4,
  life: 1.2,
  lifeJitter: 0.4,
  box: [0.4, 0.2, 0.4],
  dir1: [-1, 1.2, -1],
  dir2: [1, 3, 1],
  power: 1.5,
  gravity: 0.4,
  capacity: 256,
};

/** Enhanced Inferno: each bomb adds fire tongues, embers and the grass fire; a shock ring runs out from the caster through the eight. */
const infernoGraded = infernoWith(BOMB_TINT_GRADED, {
  bomb: seq(particles({ recipe: INFERNO_TONGUES, rate: 14, seconds: 0.9 }), particles({ recipe: INFERNO_EMBERS, count: 14 }), scorch(1.2), burn(1.2)),
  centre: ring({ texture: TEX.shockwave, colour: [1, 0.6, 0.3], scale: 5.6, growFrom: 0.3, grow: 1, seconds: 0.55, fadeTail: 0.6 }),
});

// Inferno (381 / 486 too): each of the eight bombs' explosion light, and MODEL_SKILL_INFERNO sub0 taking
// (0.5, 0.5, 0.5) x Luminosity off the ground in range 5 for its 15 ticks (MoveHandlers.cpp:2679-2682).
export const INFERNO_LIGHT: SkillLight = {
  spots: {
    blast: EXPLOSION_LIGHT,
    inferno: { color: [-0.5, -0.5, -0.5], range: 5, seconds: 15 * TICK_SECONDS, release: TICK_SECONDS, flicker: EFFECT_LUMINOSITY },
  },
  // Enhanced: each bomb lights as its orange explosion reaches, and the Inferno01 ring lights the circle out to the bombs.
  enhanced: {
    spots: {
      blast: effectLight([1, 0.6, 0.28], 1, 20 * TICK_SECONDS, { release: 16 * TICK_SECONDS }),
      inferno: effectLight([1, 0.55, 0.2], 2.8, 15 * TICK_SECONDS, { release: 10 * TICK_SECONDS, flicker: EFFECT_LUMINOSITY }),
    },
  },
};

export default defineSkill({
  id: 14,
  name: "Inferno",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [381],
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [486],
  // 14 Inferno (381 / 486 alias here): CreateInferno + MODEL_SKILL_INFERNO sub0 at the caster at AttackTime 15 (`inferno`).
  // Enhanced `infernoGraded`.
  visual: { area: dw2AtAttackTime(inferno), enhanced: { area: dw2AtAttackTime(infernoGraded) } },
  clip: { ground: A.PLAYER_SKILL_INFERNO }, // Inferno
  light: INFERNO_LIGHT,
});
