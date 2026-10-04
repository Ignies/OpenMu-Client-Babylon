import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { TRIPLE_SPREAD, afterRelease, fanArrows, steelHit } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 24,
  name: "Triple Shot",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [414, 418],
  // 24 Triple Shot: CreateArrows(Skill=1) → 3 arrows at ±15°, at the release (ZzzCharacter.cpp:4811-4828, :4893-4897).
  visual: { area: afterRelease((at, c) => fanArrows(at, c, 3, MODEL.arrow, RGBS.steel, TRIPLE_SPREAD)), impact: steelHit },
});
