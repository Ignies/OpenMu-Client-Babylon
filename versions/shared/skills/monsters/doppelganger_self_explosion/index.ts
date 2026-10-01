import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { fireHit, seq, shockRing } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 239,
  name: "Doppelganger Self Explosion",
  // 239 Doppelganger self explosion
  visual: { impact: seq(fireHit, shockRing(RGBS.fire, 4)) },
});
