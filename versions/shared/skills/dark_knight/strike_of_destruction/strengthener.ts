import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 337,
  name: "Strike of Destr Str",
  sound: 'Sound/BLOW_OF_DESTRUCTION', // Strike of Destruction Str
  clip: { ground: A.PLAYER_SKILL_BLOW_OF_DESTRUCTION }, // Strike of Destruction Str
});
