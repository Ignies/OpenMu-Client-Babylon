import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 558,
  name: "Chain Drive Strengthener",
  clip: { ground: A.PLAYER_SKILL_GIANTSWING }, // Chain Drive Str
  stepIn: 'midClip',
});
