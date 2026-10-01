import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

export default defineSkill({
  id: 508,
  name: "Fire Burst Streng",
  // Master skills with the base skill's cast (SKILL_REPLACEMENTS, _enum.h:680-681).
  sound: 'Sound/eFirebust', // Fire Burst Strengthener
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Burst Str
});
