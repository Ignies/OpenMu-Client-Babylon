import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 469,
  name: "Berserker Strengthener",
  sound: 'Sound/Berserker', // Berserker Strengthener
  clip: { ground: A.PLAYER_SKILL_SLEEP }, // Berserker Str
});
