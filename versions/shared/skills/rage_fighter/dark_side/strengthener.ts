import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 559,
  name: "Dark Side Strengthener",
  sound: 'Sound/Ragefighter/Rage_Darkside', // RageCreateEffect's AT_SKILL_DARKSIDE_STR (MonkSystem.cpp:1282-1301)
  clip: { ground: A.PLAYER_SKILL_DARKSIDE_READY }, // Dark Side Str
});
