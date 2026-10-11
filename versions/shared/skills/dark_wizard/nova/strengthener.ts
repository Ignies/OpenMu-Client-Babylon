import { defineSkill } from '@/controllers/skills/define';

import { NOVA_LIGHT } from './';

export default defineSkill({
  id: 392,
  name: "Nova Strengthener",
  light: { enhanced: NOVA_LIGHT },
});
