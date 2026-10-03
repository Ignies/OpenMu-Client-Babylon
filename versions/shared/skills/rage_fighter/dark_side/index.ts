import { defineSkill } from '@/controllers/skills/define';
import { beginDarkSide, darkSidePendingSkill, isDarkSide, nextDarkSideHit, observeDarkSideTargets, observeRageHit, rageLayer, rageStreak } from './rage';
import { MODEL, RGBS, SHADE_MOTES, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { entityPos, entityYaw } from '@/controllers/fx/core';
import { flash, flying, particles, perTick, seq, slash, ticks } from '@/controllers/skills/visuals';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 263,
  name: "Dark Side",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [559],
  // 263 Dark Side: MODEL_SHOCKWAVE01 sub3 dark wave (Light 0.2) chasing the target + BITMAP_DAMAGE2 bursts.
  visual: {
    cast: seq(
      slash(RGBS.shade, TEX.motionBlur, 0.8),
      (_at, c) => effects.spawn('model', c.scene, entityPos(c.caster, 0.05, new Vector3()), { model: MODEL.shockwave, seconds: ticks(12), scale: 0.8, colour: [0.25, 0.2, 0.3], follow: flying(c, 0.05, perTick(60)), yaw: entityYaw(c.caster) })
    ),
    impact: seq(flash(TEX.damage2, RGBS.shade, 1.3, 0.4), particles({ recipe: SHADE_MOTES, count: 20 })),
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
        nextHit: nextDarkSideHit,
        pendingSkill: darkSidePendingSkill,
        observeRageHit,
        streak: rageStreak,
      },
    },
  },
});
