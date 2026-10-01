import { defineSkill } from '@/controllers/skills/define';
import { magicGround } from '@/controllers/skills/visuals';

import { holy } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 27,
  name: "Greater Defense",
  // 27 Greater Defense: BITMAP_MAGIC+1 sub2 LT 20 + 5× MODEL_SPEARSKILL sub4 (Light (0.4,0.8,0.2), LT 10000) →
  // the ribbons persist in BUFF_VISUALS[2].
  visual: { impact: magicGround([0.4, 0.8, 0.2]) },
  // Greater Defense / Greater Damage: the same magic circle.
  light: { impact: holy(3, 1.0) },
  target: 'allyOrSelf',
});
