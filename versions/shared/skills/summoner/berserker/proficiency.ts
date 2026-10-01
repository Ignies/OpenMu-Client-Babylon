import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 470,
  name: "Berserker Proficiency",
  sound: 'Sound/Berserker', // Berserker Proficiency
  clip: { ground: A.PLAYER_SKILL_SLEEP }, // Berserker Proficiency
});
