import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 342,
  name: "Death Stab Mastery",
  clip: { ground: A.PLAYER_ATTACK_ONETOONE }, // Death Stab Mastery
});
