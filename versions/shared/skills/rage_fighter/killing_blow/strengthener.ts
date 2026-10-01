import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 551,
  name: "Killing Blow Strengthener",
  clip: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow Str
});
