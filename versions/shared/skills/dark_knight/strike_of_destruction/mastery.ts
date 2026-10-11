import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 343,
  name: "Strike of Destr Mast",
  sound: 'Sound/BLOW_OF_DESTRUCTION', // Strike of Destruction Mastery
  clip: { ground: A.PLAYER_SKILL_BLOW_OF_DESTRUCTION }, // Strike of Destruction Mastery
});
