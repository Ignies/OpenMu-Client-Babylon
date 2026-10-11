import { defineSkill } from '@/controllers/skills/define';
import { BLOOD_CHIPS, BLOOD_MIST, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { SkillContext, Step, cm, particles, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lightAt } from '../../_shared';
import { lighting } from '@/controllers/lighting';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** Blood Storm's crimson: Double Blade's red trail Light (1,0.2,0.2) a shade darker under the bloom (ZzzCharacter.cpp:3950-3953). */
const BLOOD_STORM_RED: RGB = [0.9, 0.18, 0.12];

/**
 * Blood Storm (344; 346 by alias). No client of record has it: sven, MuOnlineClient and Source Main 5.2
 * stop the Blade Master ids at 338 and have no case for it, so this is a renewed look built from original
 * art only, for the user to sign off. At the target: MODEL_STORM (Storm01) turned into a crimson vortex,
 * four joint_sword_red ribbons spiralling up round it the way JOINT_HEALING sub10 does, and a blood spray at
 * chest height. The caster spins through the Twisting Slash clip; no light (a dark red one would not read).
 */
const bloodStorm: Step = (at, c) => bloodStormWith(at, c, 1);
/** `smooth`: curve pieces per tick on the ribbons (1, the Classic, draws each tick as a straight chord). */
const bloodStormWith = (at: Vector3, c: SkillContext, smooth: number): void => {
  // Scale 0.45: at the 0.8 first tried, Storm01 stood as a red beam off the top of the screen.
  effects.spawn('model', c.scene, at, { model: MODEL.storm, seconds: ticks(30), colour: BLOOD_STORM_RED, alpha: 0.7, spin: 10, scale: 0.45, fadeIn: 0.15, fadeTail: 0.4 });
  for (let i = 0; i < 4; i++) {
    const phase = (i * Math.PI) / 2;
    const t0 = fxNow();
    const head: PointSource = out => {
      const t = fxNow() - t0;
      const a = phase + t * 10;
      return out.set(at.x + Math.cos(a) * cm(80), at.y + 0.2 + t * 2, at.z + Math.sin(a) * cm(80));
    };
    effects.spawn('joint', c.scene, at, { head, maxTails: 12, width: 0.3, colour: [1, 0.2, 0.2], seconds: ticks(20), texture: TEX.jointFire, ...(smooth > 1 ? { smooth } : {}) });
  }
  particles({ recipe: BLOOD_CHIPS, count: 30, height: 0.9 })(at, c);
  particles({ recipe: BLOOD_MIST, count: 6, height: 0.9 })(at, c);
};

/** Crimson embers flung off the turning vortex. */
const STORM_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [1, 0.38, 0.26],
  colourEnd: [0.3, 0.02, 0.02],
  size: 0.14,
  sizeJitter: 0.4,
  life: 0.5,
  lifeJitter: 0.3,
  box: [0.6, 0.6, 0.6],
  dir1: [-1, 0.2, -1],
  dir2: [1, 1, 1],
  power: 2.6,
  powerJitter: 0.4,
  gravity: -3,
  spin: 5,
  capacity: 64,
};

/**
 * Blood Storm, graded: the same vortex, ribbons and spray, over a shade of the vortex so the crimson
 * reads on a sunlit floor, with an inner vortex turning the other way, a first crimson pulse and shock,
 * embers and blood flung off it while it turns and a spatter left on the ground. Its light is `storm`.
 */
const bloodStormPlus: Step = (at, c) => {
  effects.spawn('model', c.scene, at, { model: MODEL.storm, seconds: ticks(30), colour: [0.6, 0.6, 0.6], blend: 'subtract', maxCover: 0.4, spin: 10, scale: 0.45, fadeIn: 0.15, fadeTail: 0.4 });
  // The ribbons as curves: turning 0.4 rad a tick, the Classic's chords read as a polygon.
  bloodStormWith(at, c, 4);
  lighting.skillSpot(c.scene, 344, 'storm', lightAt(at.clone()));
  effects.spawn('model', c.scene, at, { model: MODEL.storm, seconds: ticks(26), colour: [1, 0.3, 0.18], alpha: 0.6, spin: -14, scale: 0.3, fadeIn: 0.1, fadeTail: 0.45 });
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: [0.55, 0.1, 0.06], size: 1.6, height: 0.9, seconds: ticks(6), fadeTail: 0.9 });
  effects.spawn('ring', c.scene, at, { texture: TEX.shockwave, colour: [0.7, 0.12, 0.08], scale: 1, grow: 2.5, seconds: ticks(14), fadeColour: true });
  effects.spawn('ring', c.scene, at, { texture: TEX.blood, colour: RGBS.gore, blend: 'alpha', scale: 1.4, grow: 1.5, spin: 40, seconds: ticks(40), fadeTail: 0.5 });
  effects.spawn('particles', c.scene, at, { recipe: STORM_EMBERS, rate: 45, seconds: ticks(22), height: 0.2 });
  effects.spawn('particles', c.scene, at, { recipe: BLOOD_CHIPS, rate: 30, seconds: ticks(18), height: 0.9 });
};

export default defineSkill({
  id: 344,
  name: "Blood Storm",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [346],
  // 344 Blood Storm (346 Strengthener by alias): no original; a renewed look from original art (bloodStorm).
  visual: { area: bloodStorm, enhanced: { area: bloodStormPlus } },
  sound: 'Sound/sKnightSkill4', // Blood Storm (no original: the Twisting Slash sound, with its clip)
  // Blood Storm has no original (skillVisuals.ts bloodStorm): the Twisting Slash spin, which the Blade
  // Master and the Duel Master both have.
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Blood Storm
  // Blood Storm (346 fires it as 344): no original. Graded: the vortex's crimson over the ~1.2 tiles its
  // ribbons turn in, for its 30 ticks.
  light: { enhanced: { spots: { storm: effectLight([1, 0.22, 0.14], 1.2, 1.2, { release: 0.6, heightOffset: 0.6 }) } } },
});
