import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 360,
  name: "Swell Life Proficiency",
  sound: 'Sound/eSwellLife', // Swell Life Proficiency
  clip: { ground: A.PLAYER_SKILL_VITALITY }, // Swell Life Proficiency
});
