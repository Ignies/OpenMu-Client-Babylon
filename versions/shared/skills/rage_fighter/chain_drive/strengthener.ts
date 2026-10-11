import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 558,
  name: "Chain Drive Strengthener",
  sound: 'Sound/Ragefighter/Rage_Giantswing', // RageCreateEffect's AT_SKILL_CHAIN_DRIVE_STR (MonkSystem.cpp:1121-1126)
  clip: { ground: A.PLAYER_SKILL_GIANTSWING }, // Chain Drive Str
  stepIn: 'midClip',
});
