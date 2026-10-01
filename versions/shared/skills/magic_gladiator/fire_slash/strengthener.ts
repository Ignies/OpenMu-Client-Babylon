import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 490,
  name: "Blood Attack Strengthen",
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Fire Slash Str
});
