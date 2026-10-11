import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { fireHit, seq, shockRing } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 79,
  name: "Explosion",
  // 79 Explosion (monster)
  visual: { impact: seq(fireHit, shockRing(RGBS.fire, 3)) },
});
