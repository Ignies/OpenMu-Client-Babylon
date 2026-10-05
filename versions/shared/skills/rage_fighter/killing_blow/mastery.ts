import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 554,
  name: "Killing Blow Mastery",
  sound: 'Sound/Ragefighter/Rage_Thrust', // RageCreateEffect's AT_SKILL_KILLING_BLOW_MASTERY (MonkSystem.cpp:1089-1103)
  clip: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow Mastery
  stepIn: 'cast',
});
