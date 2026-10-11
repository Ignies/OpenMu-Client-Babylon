import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

export default defineSkill({
  id: 514,
  name: "Fire Burst Mastery",
  sound: 'Sound/eFirebust', // Fire Burst Mastery
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Burst Mastery
});
