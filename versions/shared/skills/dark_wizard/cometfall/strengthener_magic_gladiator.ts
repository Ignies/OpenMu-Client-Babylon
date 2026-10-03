import { defineSkill } from '@/controllers/skills/define';

import { COMETFALL_LIGHT } from './';

export default defineSkill({
  id: 484,
  name: "Blast Strengthener",
  castsAsSpell: true, // the MG's Blast Str casts with SetPlayerMagic (SkillCast.cpp:525-531)
  light: COMETFALL_LIGHT,
});
