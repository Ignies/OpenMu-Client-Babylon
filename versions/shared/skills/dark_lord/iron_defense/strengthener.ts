import { defineSkill } from '@/controllers/skills/define';
import { IRON_DEFENSE } from '../../_shared';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_HAND } from '../../_shared';

export default defineSkill({
  id: 524,
  name: "Iron Defense Str",
  visual: IRON_DEFENSE,
  clip: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Iron Defense Str
});
