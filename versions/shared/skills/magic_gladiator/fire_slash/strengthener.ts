import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 490,
  name: "Blood Attack Strengthen",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Fire Slash Str
});
