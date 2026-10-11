import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 346,
  name: "Blood Storm Strengthener",
  sound: 'Sound/sKnightSkill4', // Blood Storm Strengthener
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Blood Storm Strengthener
});
