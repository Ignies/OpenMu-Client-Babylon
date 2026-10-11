import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 340,
  name: "Strike of Destr Prof",
  sound: 'Sound/BLOW_OF_DESTRUCTION', // Strike of Destruction Proficiency
  clip: { ground: A.PLAYER_SKILL_BLOW_OF_DESTRUCTION }, // Strike of Destruction Proficiency
});
