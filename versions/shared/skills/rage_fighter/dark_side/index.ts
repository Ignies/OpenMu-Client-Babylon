import { defineSkill } from '@/controllers/skills/define';
import { beginDarkSide, darkSidePendingSkill, isDarkSide, nextDarkSideHit, observeDarkSideEcho, observeDarkSideTargets, observeRageHit, rageLayer, rageStreak } from './rage';
import { MODEL, RGBS, SHADE_MOTES, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { entityGone, entityPos, entityYaw } from '@/controllers/fx/core';
import { IMPACT_HEIGHT, after, flash, flying, particles, perTick, seq, slash, ticks, type Step } from '@/controllers/skills/visuals';

import { A } from '@/controllers/combat/recipes';
import { deg } from '../../_shared';
import { windForce } from '../_shared';

/** RageCreateEffect's MODEL_WINDFOCE sub2 (1, 0.5, 0.2) and the sub3s (1, 0.5, 0) it raises (MonkSystem.cpp:1297-1298, MoveHandlers.cpp:9579-9596). */
const windPillar = windForce([1, 0.5, 0.2], true, [1, 0.5, 0]);

/**
 * The afterimage (CDummyUnit, MonkSystem.cpp:1479-1498) advances its frame 0.05 a call; DarksideRendering bursts
 * BITMAP_DAMAGE2 on the target while `(int)(frame * 10)` is 10 and sends the dark MODEL_SHOCKWAVE01 (Light 0.2) while
 * it is 15 (:811-826). The original calls it per rendered frame; here a call is a 25 Hz tick: ticks 20-21 and 30-31.
 */
const BURST_TICKS = [20, 21];
const WAVE_TICKS = [30, 31];

/** The wave stands on its side at the afterimage's way - 180 (MonkSystem.cpp:813-816); the caster's facing stands in for that way. */
const wave: Step = (_at, c) => {
  if (entityGone(c.caster)) return;
  effects.spawn('model', c.scene, entityPos(c.caster, 0.05, new Vector3()), { model: MODEL.shockwave, seconds: ticks(12), scale: 0.8, colour: [0.25, 0.2, 0.3], follow: flying(c, 0.05, perTick(60)), angle: [90, 0, deg(entityYaw(c.caster)) - 180] });
};
const burst: Step = (_at, c) => {
  const target = c.target;
  if (!target || entityGone(target) || entityGone(c.caster)) return;
  seq(flash(TEX.damage2, RGBS.shade, 1.3, 0.4), particles({ recipe: SHADE_MOTES, count: 20 }))(entityPos(target, IMPACT_HEIGHT, new Vector3()), c);
};

export default defineSkill({
  id: 263,
  name: "Dark Side",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [559],
  // 263 Dark Side: the wind pillar at the caster, once a cast; each blow (the cast's and every follow-up's,
  // rage.ts), the BITMAP_DAMAGE2 bursts and the dark wave on the afterimage's frame (see above).
  visual: {
    cast: seq(slash(RGBS.shade, TEX.motionBlur, 0.8), windPillar),
    impact: seq(...BURST_TICKS.map(t => after(ticks(t), burst)), ...WAVE_TICKS.map(t => after(ticks(t), wave))),
  },
  sound: 'Sound/Ragefighter/Rage_Darkside', // Dark Side
  clip: { ground: A.PLAYER_SKILL_DARKSIDE_READY }, // Dark Side
  // Dark Side follow-ups and the Rage streak (rage.ts).
  combat: {
    layer: rageLayer,
    hooks: {
      darkSide: {
        isDarkSide,
        begin: beginDarkSide,
        observeTargets: observeDarkSideTargets,
        observeEcho: observeDarkSideEcho,
        nextHit: nextDarkSideHit,
        pendingSkill: darkSidePendingSkill,
        observeRageHit,
        streak: rageStreak,
      },
    },
  },
});
