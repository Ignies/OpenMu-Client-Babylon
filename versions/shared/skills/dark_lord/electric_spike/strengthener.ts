import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_FLASH, OTHERS_SEE_FLASH } from './';

import { ELECTRIC_SPIKE_LIGHT } from './';

export default defineSkill({
  id: 519,
  name: "Electric Spark Streng",
  othersSee: OTHERS_SEE_FLASH,
  delayMs: 10000, // Electric Spark Strengthener
  clip: { ground: A.PLAYER_SKILL_FLASH, ...MOUNTED_FLASH }, // Electric Spike Str
  light: ELECTRIC_SPIKE_LIGHT,
});
