import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { holyCircle } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 430,
  name: "Bless",
  visual: { impact: holyCircle(RGBS.gold) },
});
