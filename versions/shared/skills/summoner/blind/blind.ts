import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 461,
  name: "Blind",
  sound: 'Sound/SE_Ch_summoner_skill04_blind', // Blind (OpenMU's id for 220)
  clip: { ground: A.PLAYER_SKILL_SLEEP }, // Blind (OpenMU)
});
