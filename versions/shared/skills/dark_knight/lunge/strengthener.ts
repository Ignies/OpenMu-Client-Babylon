import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 329,
  name: "Lunge Strengthener",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  sound: 'Sound/sKnightSkill2', // Lunge Str
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD2 }, // Lunge Str
});
