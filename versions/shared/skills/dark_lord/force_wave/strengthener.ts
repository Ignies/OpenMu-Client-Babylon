import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

export default defineSkill({
  id: 509,
  name: "Force Wave Streng",
  sound: 'Sound/sKnightSkill1', // Force Wave Strengthener
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Force Wave Str
});
