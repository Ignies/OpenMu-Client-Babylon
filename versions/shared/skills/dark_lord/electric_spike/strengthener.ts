import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_FLASH } from './';

export default defineSkill({
  id: 519,
  name: "Electric Spark Streng",
  delayMs: 10000, // Electric Spark Strengthener
  clip: { ground: A.PLAYER_SKILL_FLASH, ...MOUNTED_FLASH }, // Electric Spike Str
});
