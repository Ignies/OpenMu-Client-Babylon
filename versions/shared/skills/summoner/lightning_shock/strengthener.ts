import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 456,
  name: "Lightning Shock Str",
  sound: 'Sound/lightning_shock', // Lightning Shock Strengthener
  clip: { ground: A.PLAYER_SKILL_LIGHTNING_SHOCK }, // Lightning Shock Str
});
