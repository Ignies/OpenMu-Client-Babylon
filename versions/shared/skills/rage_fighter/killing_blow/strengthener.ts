import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 551,
  name: "Killing Blow Strengthener",
  sound: 'Sound/Ragefighter/Rage_Thrust', // RageCreateEffect's AT_SKILL_KILLING_BLOW_STR (MonkSystem.cpp:1089-1103)
  clip: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow Str
  stepIn: 'cast',
});
