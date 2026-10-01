import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_SWORD } from '../../_shared';

export default defineSkill({
  id: 479,
  name: "Cyclone Strengthener",
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD4, ...MOUNTED_SWORD }, // Cyclone Str (Duel Master)
});
