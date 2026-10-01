import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 339,
  name: "Death Stab Proficiency",
  clip: { ground: A.PLAYER_ATTACK_ONETOONE }, // Death Stab Proficiency
});
