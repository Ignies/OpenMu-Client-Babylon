import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 381,
  name: "Inferno Strengthener",
  clip: { ground: A.PLAYER_SKILL_INFERNO }, // Inferno Str
});
