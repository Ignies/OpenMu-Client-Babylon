import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 332,
  name: "Twisting Slash Mastery",
  sound: 'Sound/sKnightSkill4', // Twisting Slash Mastery
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash Mastery
});
