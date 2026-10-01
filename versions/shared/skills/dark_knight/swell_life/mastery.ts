import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 363,
  name: "Swell Life Mastery",
  sound: 'Sound/eSwellLife', // Swell Life Mastery
  clip: { ground: A.PLAYER_SKILL_VITALITY }, // Swell Life Mastery
  target: 'self',
});
