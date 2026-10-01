import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 331,
  name: "Rageful Blow Streng",
  clip: { ground: A.PLAYER_ATTACK_SKILL_FURY_STRIKE }, // Rageful Blow Str
});
