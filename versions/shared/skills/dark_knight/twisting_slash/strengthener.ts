import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 330,
  name: "Twisting Slash Streng",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  sound: 'Sound/sKnightSkill4', // Twisting Slash Str
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash Str
});
