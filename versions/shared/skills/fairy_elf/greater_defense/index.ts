import { defineSkill } from '@/controllers/skills/define';
import { atBuffRelease } from '../_shared';
import { magicGround } from '@/controllers/skills/visuals';

import { holy } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 27,
  name: "Greater Defense",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [417, 423],
  effect: 2, // MagicEffectCancelled names skill 27: the buff it drops
  effectAliases: [417, 423],
  // 27 Greater Defense, at the release (ZzzCharacter.cpp:4914-4944): BITMAP_MAGIC+1 sub2 LT 20 + 5× MODEL_SPEARSKILL sub4 (Light (0.4,0.8,0.2), LT 10000) →
  // the ribbons persist in BUFF_VISUALS[2].
  visual: { impact: atBuffRelease(magicGround([0.4, 0.8, 0.2])) },
  // Greater Defense / Greater Damage: the same magic circle.
  light: { strike: holy(3, 1.0) },
  target: 'allyOrSelf',
});
