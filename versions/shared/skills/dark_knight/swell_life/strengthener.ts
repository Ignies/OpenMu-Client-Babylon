import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 356,
  name: "Swell Life Strengt",
  sound: 'Sound/eSwellLife', // Swell Life Str
  clip: { ground: A.PLAYER_SKILL_VITALITY }, // Swell Life Str
});
