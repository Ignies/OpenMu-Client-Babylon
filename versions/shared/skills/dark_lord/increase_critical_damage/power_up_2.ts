import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_HAND } from '../../_shared';

export default defineSkill({
  id: 515,
  name: "Crit DMG Inc PowUp (2)",
  delayMs: 10000, // Crit DMG Inc PowUp (2)
  clip: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Increase Critical Damage Str2
});
