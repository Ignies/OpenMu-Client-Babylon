import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { holyCircle } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 433,
  name: "Bless Strengthener",
  visual: { impact: holyCircle(RGBS.gold) },
});
