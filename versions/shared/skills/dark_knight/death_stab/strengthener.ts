import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 336,
  name: "Death Stab Strengthener",
  clip: { ground: A.PLAYER_ATTACK_ONETOONE }, // Death Stab Str
});
