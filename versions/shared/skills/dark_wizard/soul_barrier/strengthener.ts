import { defineSkill } from '@/controllers/skills/define';

import { SOUL_BARRIER_LIGHT } from './';

export default defineSkill({
  id: 403,
  name: "Soul Barrier Strength",
  // Still typed DirectHit (pre-inheritance) but cast as its base (SkillsInitializer.cs:1001-1025; ClassAttack.cpp:1153-1155).
  castsAsSpell: true,
  light: { enhanced: SOUL_BARRIER_LIGHT },
  target: 'playerOrSelf',
});
