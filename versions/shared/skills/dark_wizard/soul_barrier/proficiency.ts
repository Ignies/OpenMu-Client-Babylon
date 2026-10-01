import { defineSkill } from '@/controllers/skills/define';

import { SOUL_BARRIER_LIGHT } from './';

export default defineSkill({
  id: 404,
  name: "Soul Barrier Proficie",
  light: { enhanced: SOUL_BARRIER_LIGHT },
  target: 'allyOrSelf',
});
