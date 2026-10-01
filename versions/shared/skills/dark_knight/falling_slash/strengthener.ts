import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 328,
  name: "Falling Slash Streng",
  sound: 'Sound/sKnightSkill1', // Falling Slash Str
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD1 }, // Falling Slash Str
});
