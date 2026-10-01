import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 327,
  name: "Slash Strengthener",
  sound: 'Sound/sKnightSkill4', // Slash Str
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD5 }, // Slash Str
});
