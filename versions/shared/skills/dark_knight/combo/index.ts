import { defineSkill } from '@/controllers/skills/define';
import { comboFlash, comboKnockUp, comboLayer, combosLanded, observeSkillAnimation } from './state';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { entityPos, type ParticleRecipe } from '@/controllers/fx/core';
import { type Ray } from '@/controllers/fx/rays';
import { Step, atCaster, cm, forwardOf, perTick, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { tmpEmitter } from '../_shared';

import { effectLight } from '@/controllers/lighting/recipes';

/** MODEL_COMBO's BlendMeshLight /= 1.4 a tick (MoveHandlers.cpp:5260). */
const COMBO_DECAY = 1 / 1.4;
/** The original's 60 BITMAP_LIGHT sub0 rays (WSclient.cpp:4829-4832). */
const COMBO_RAYS = 60;

/**
 * The combo burst at the caster (WSclient.cpp:4829-4832): MODEL_COMBO 50 cm up, unturned, every mesh bright
 * (BlendMesh -2), LT 20, its Scale 0.9 growing by 0.1, 0.2, 0.3... a tick while LT > 4 - 14.5 by tick 16, which
 * `growEase` 2 over the life follows - and its light /1.4 a tick (ZzzEffect.cpp:3159-3175, MoveHandlers.cpp:5251-5263).
 * With it 60 BITMAP_LIGHT sub0 joints (30 here): width 70-109 cm, Light (0.1,0.5,1), a random yaw and `Angle[0] = 30 -
 * rand() % 40` (positive dives), each stepping 10 times a tick 10-19 cm along it for the first 4 ticks and
 * keeping its last 30 steps, then holding until LT 0 (ZzzEffectJoint.cpp:2421-2434, :6453-6468).
 */
const comboBurst: Step = (at, c) => {
  // 0.9 + 0.05 n (n + 1) by tick n, stopping at tick 16 (LT 4): 14.5, 16.1 times the start.
  effects.spawn('model', c.scene, at, { model: MODEL.combo, seconds: ticks(20), scale: 0.9, grow: 16.1, growEase: 2, growUntil: 0.8, decay: COMBO_DECAY, fadeTail: 0.05, colour: RGBS.white });
  // One ribbon mesh for all sixty (effects/rays.ts): each head runs 10 steps a tick for 4 ticks and the last
  // 30 steps (3 ticks) are what is drawn, from 10 to 40 steps out once it stops.
  const rays: Ray[] = [];
  for (let i = 0; i < COMBO_RAYS; i++) {
    const heading = forwardOf(Math.random() * Math.PI * 2);
    const pitch = ((30 - Math.floor(Math.random() * 40)) * Math.PI) / 180;
    rays.push({
      dir: [heading.x * Math.cos(pitch), -Math.sin(pitch), heading.z * Math.cos(pitch)],
      speed: perTick(10 * (10 + Math.floor(Math.random() * 10))),
      width: cm(70 + Math.floor(Math.random() * 40)),
    });
  }
  effects.spawn('rays', c.scene, at, { rays, texture: TEX.flare, colour: [0.1, 0.5, 1], seconds: ticks(20), moveFor: ticks(4), tail: ticks(3), fadeTail: 0.05 });
};

/** Combo's chips thrown out of the burst with its rays. */
const COMBO_CHIPS: ParticleRecipe = {
  texture: TEX.spark,
  colour: [0.55, 0.8, 1.2],
  colourEnd: [0.05, 0.2, 0.5],
  size: 0.17,
  sizeJitter: 0.3,
  life: 0.45,
  lifeJitter: 0.3,
  dir1: [-1, 0.1, -1],
  dir2: [1, 0.9, 1],
  power: 5,
  powerJitter: 0.3,
  gravity: -4,
  spin: 4,
  capacity: 64,
};

/**
 * Combo, graded: the same disc and sixty rays, with a white-blue core at the caster, a shock running out
 * on the ground under the rays that dive into it, and chips thrown with them. Its light is the row's `burst`.
 */
const comboBurstPlus: Step = (at, c) => {
  comboBurst(at, c);
  lighting.skillSpot(c.scene, 59, 'burst', out => {
    const p = entityPos(c.caster, cm(50), tmpEmitter);
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
  });
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: [0.35, 0.6, 1.1], size: 2.2, grow: 1.5, seconds: ticks(6), fadeTail: 0.9 });
  effects.spawn('ring', c.scene, at, { texture: TEX.shockwave, colour: [0.25, 0.5, 1], scale: 1.5, grow: 4, seconds: ticks(12), fadeColour: true });
  effects.spawn('particles', c.scene, at, { recipe: COMBO_CHIPS, count: 24 });
};

export default defineSkill({
  id: 59,
  name: "Combo",
  // 59 Combo: MODEL_COMBO and its 60 rays at the caster, whoever the target (WSclient.cpp:4829-4832).
  visual: {
    impact: atCaster(comboBurst, cm(50)),
    area: atCaster(comboBurst, cm(50)),
    enhanced: { impact: atCaster(comboBurstPlus, cm(50)), area: atCaster(comboBurstPlus, cm(50)) },
  },
  sound: 'Sound/eCombo', // Combo
  // Combo: the original lights nothing. Graded: the rays' blue over the ~3 tiles they reach, for their 20 ticks.
  light: { enhanced: { spots: { burst: effectLight([0.3, 0.6, 1], 3, 0.8, { release: 0.56 }) } } },
  // Combo flash and knock-up timers (state.ts).
  combat: {
    layer: comboLayer,
    hooks: { combo: { flash: comboFlash, landed: combosLanded, knockUp: comboKnockUp, observeSkillAnimation } },
  },
});
