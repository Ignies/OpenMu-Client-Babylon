import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 560,
  name: "Dragon Roar Strengthener",
  sound: 'Sound/Ragefighter/Rage_Dragonlower', // RageCreateEffect's AT_SKILL_DRAGON_ROAR_STR (MonkSystem.cpp:1262-1280)
  clip: { ground: A.PLAYER_SKILL_DRAGONLORE }, // Dragon Roar Str
});
