import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, SMOKE, TEX } from '@/controllers/fx/recipes';
import { ICE_MOTES } from '../_shared';
import { IMPACT_HEIGHT, arrow, cm, hitSparks, orbiting, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';

import { frost } from '@/controllers/lighting/recipes';

/** Arrows are faster than magic bolts: 70 cm a tick, like `controllers/skills/visuals.ts`. */
const ARROW_SPEED = 17.5;

export default defineSkill({
  id: 51,
  name: "Ice Arrow",
  // ReceiveMagicFinish drops eDeBuff_Harden (WSclient.cpp:3935-3938).
  effect: 57,
  effectAliases: [424],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [424],
  // 51 Ice Arrow: cast - MODEL_ICE sub1 + sub2 (+180°) at the target LT 20, Scale 0.8, BlendMeshLight 0.5, 3× BITMAP_SMOKE,
  // a BITMAP_FIRE+2 sub10 orbiting r=60; impact: a single arrow.
  visual: {
    travel: arrow(MODEL.arrow, RGBS.ice),
    impact: (at, c) => {
      const feet = at.clone();
      feet.y -= IMPACT_HEIGHT;
      effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(20), scale: 0.8, colour: [0.5, 0.5, 0.5] });
      effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(20), scale: 0.8, colour: [0.5, 0.5, 0.5], yaw: Math.PI });
      effects.spawn('particles', c.scene, feet, { recipe: SMOKE, count: 3, height: 0.3 });
      if (c.target) effects.spawn('sprite', c.scene, feet, { texture: TEX.fire3, colour: RGBS.ice, size: 0.5, seconds: ticks(20), follow: orbiting(c.target, cm(60), 0.3, 4, 0), spin: 3 });
      hitSparks(ICE_MOTES, 10)(at, c);
    },
  },
  // Ice Arrow: MODEL_ARROW range 2 (:11777). The bolt light rides the same
  // path the arrow does and fires the impact on arrival, so it keeps it.
  light: { travel: { ...frost(2, 3), speed: ARROW_SPEED }, impact: frost(2, 0.4) },
});
