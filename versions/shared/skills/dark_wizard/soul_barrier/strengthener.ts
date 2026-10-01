import { defineSkill } from '@/controllers/skills/define';

import { SOUL_BARRIER_LIGHT } from './';

export default defineSkill({
  id: 403,
  name: "Soul Barrier Strength",
  light: { enhanced: SOUL_BARRIER_LIGHT },
  target: 'allyOrSelf',
});
