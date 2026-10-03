import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { fanArrows, steelHit } from '@/controllers/skills/visuals';
import { multiShotVolley } from '../../_shared';

const FIVE_SPREAD = [-20, -10, 0, 10, 20].map(d => (d * Math.PI) / 180);

export default defineSkill({
  id: 235,
  name: "Multi-Shot",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [411, 431],
  // 235 Multi-Shot: five arrows at ±5/10/20; the muzzle volley is 3× MODEL_MULTI_SHOT1 at the caster and
  // 2× MULTI_SHOT2 / MULTI_SHOT3 20 cm ahead, Light (0.8,0.9,1.6) (WSclient.cpp AT_SKILL_MULTI_SHOT).
  visual: {
    area: (at, c) => {
      fanArrows(at, c, 5, MODEL.arrow, RGBS.steel, FIVE_SPREAD);
      multiShotVolley(at, c);
    },
    impact: steelHit,
  },
});
