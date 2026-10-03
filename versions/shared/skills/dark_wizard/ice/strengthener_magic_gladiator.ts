import { defineSkill } from '@/controllers/skills';

export default defineSkill({
  id: 489,
  name: "Ice Strengthener",
  // The MG's AT_SKILL_ICE_STR_MG goes through UseSkillWizard -> SetPlayerMagic (ZzzInterface.cpp:1362-1386,
  // SkillCast.cpp:503-514) though OpenMU types it physical. Look, sound and light are Ice's (master alias 7).
  castsAsSpell: true,
});
