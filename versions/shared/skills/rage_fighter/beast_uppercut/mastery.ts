import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 555,
  name: "Beast Uppercut Mastery",
  clip: { ground: A.PLAYER_SKILL_STAMP }, // Beast Uppercut Mastery
});
