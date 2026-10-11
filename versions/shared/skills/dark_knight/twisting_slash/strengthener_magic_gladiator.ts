import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 481,
  name: "Twisting Slash Stren",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash Str (Duel Master)
});
