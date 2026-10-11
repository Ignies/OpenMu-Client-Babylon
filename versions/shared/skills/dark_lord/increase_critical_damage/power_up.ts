import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_HAND } from '../../_shared';

export default defineSkill({
  id: 511,
  name: "Critical DMG Inc PowUp",
  clip: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Increase Critical Damage Str1
});
