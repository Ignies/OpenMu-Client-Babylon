import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { slashOddSwing } from './';

export default defineSkill({
  id: 327,
  name: "Slash Strengthener",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  poseClip: slashOddSwing,
  swordCount: true,
  sound: 'Sound/sKnightSkill4', // Slash Str
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD5 }, // Slash Str
});
