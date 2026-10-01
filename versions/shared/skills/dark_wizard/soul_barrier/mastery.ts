import { defineSkill } from '@/controllers/skills/define';

import { SOUL_BARRIER_LIGHT } from './';

export default defineSkill({
  id: 406,
  name: "Soul Barrier Mastery",
  light: { enhanced: SOUL_BARRIER_LIGHT },
});
