import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { TRIPLE_SPREAD, fanArrows, steelHit } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 24,
  name: "Triple Shot",
  // 24 Triple Shot: CreateArrows(Skill=1) → 3 arrows at ±15°.
  visual: { area: (at, c) => fanArrows(at, c, 3, MODEL.arrow, RGBS.steel, TRIPLE_SPREAD), impact: steelHit },
});
