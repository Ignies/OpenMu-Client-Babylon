import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_SWORD } from '../../_shared';

export default defineSkill({
  id: 482,
  name: "Power Slash Streng",
  clip: { ground: A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO, ...MOUNTED_SWORD }, // Power Slash Str
});
