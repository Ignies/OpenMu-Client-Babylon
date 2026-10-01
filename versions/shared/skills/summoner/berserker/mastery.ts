import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 472,
  name: "Berserker Mastery",
  sound: 'Sound/Berserker', // Berserker Mastery
  clip: { ground: A.PLAYER_SKILL_SLEEP }, // Berserker Mastery
  target: 'self',
});
