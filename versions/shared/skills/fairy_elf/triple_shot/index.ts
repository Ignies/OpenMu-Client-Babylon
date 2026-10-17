import { defineSkill } from '@/controllers/skills/define';
import { TRIPLE_SPREAD, afterRelease, fanArrows, launcherShot, steelHit } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 24,
  name: "Triple Shot",
  checksArrows: true, // CheckArrow() before the shot (SkillCast.cpp:1189)
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [414, 418],
  // 24 Triple Shot: CreateArrows(Skill=1) → 3 arrows at ±15°, at the release (ZzzCharacter.cpp:4811-4828, :4893-4897),
  // each the bow's own arrow (CreateArrow, ZzzEffectMagicSkill.cpp:174-251).
  visual: {
    area: afterRelease((at, c) => {
      const s = launcherShot(c.caster);
      fanArrows(at, c, 3, s.model, s.colour, TRIPLE_SPREAD);
    }),
    impact: steelHit,
  },
});
