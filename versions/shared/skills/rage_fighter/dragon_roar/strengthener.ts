import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 560,
  name: "Dragon Roar Strengthener",
  clip: { ground: A.PLAYER_SKILL_DRAGONLORE }, // Dragon Roar Str
});
