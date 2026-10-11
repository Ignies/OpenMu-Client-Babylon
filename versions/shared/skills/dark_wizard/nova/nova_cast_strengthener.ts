import { defineSkill } from '@/controllers/skills/define';

import { NOVA_LIGHT } from './';

export default defineSkill({
  id: 395,
  name: "Nova Cast Strengthener",
  light: { enhanced: NOVA_LIGHT },
});
