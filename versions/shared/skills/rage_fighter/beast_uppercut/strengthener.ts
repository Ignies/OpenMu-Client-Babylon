import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 552,
  name: "Beast Uppercut Strengthener",
  clip: { ground: A.PLAYER_SKILL_STAMP }, // Beast Uppercut Str
});
