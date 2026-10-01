import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 554,
  name: "Killing Blow Mastery",
  clip: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow Mastery
  stepIn: 'cast',
});
