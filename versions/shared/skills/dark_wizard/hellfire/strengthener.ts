import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 388,
  name: "Hellfire Strengthener",
  clip: { ground: A.PLAYER_SKILL_HELL }, // Hell Fire Str
});
