import { defineSkill } from '@/controllers/skills';

export default defineSkill({
  id: 491,
  name: "Ice Mastery",
  // Cast with SetPlayerMagic like the MG's Ice Strengthener (SkillCast.cpp:503-514) though OpenMU types it
  // physical. Look, sound and light are Ice's (master alias 7).
  castsAsSpell: true,
});
