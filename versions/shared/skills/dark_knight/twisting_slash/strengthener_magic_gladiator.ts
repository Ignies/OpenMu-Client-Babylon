import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 481,
  name: "Twisting Slash Stren",
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash Str (Duel Master)
});
