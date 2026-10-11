import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 463,
  name: "Blind Strengthener",
  sound: 'Sound/SE_Ch_summoner_skill04_blind', // Blind Strengthener
  clip: { ground: A.PLAYER_SKILL_SLEEP }, // Blind Str
});
