import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 559,
  name: "Dark Side Strengthener",
  clip: { ground: A.PLAYER_SKILL_DARKSIDE_READY }, // Dark Side Str
});
