import { defineSkill } from '@/controllers/skills/define';

import { SOUL_BARRIER_LIGHT } from './';

export default defineSkill({
  id: 404,
  name: "Soul Barrier Proficie",
  castsAsSpell: true, // cast as its base (SkillsInitializer.cs:1001-1025)
  light: { enhanced: SOUL_BARRIER_LIGHT },
  target: 'playerOrSelf',
});
