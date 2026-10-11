import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 326,
  name: "Cyclone Strengthener",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  // Blade Master ranks play their base skill's sound: they share its case (WSclient.cpp:4368-4417,
  // ZzzCharacter.cpp:4190-4212, :4410-4419).
  sound: 'Sound/sKnightSkill4', // Cyclone Str
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD4 }, // Cyclone Str
});
