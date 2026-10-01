import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 441,
  name: "Infinity Arrow Str",
  clip: { ground: A.PLAYER_RUSH1 }, // Infinity Arrow Str
});
