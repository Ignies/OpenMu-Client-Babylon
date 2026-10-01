import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

import { SWELL_LIGHT } from './';

export default defineSkill({
  id: 380,
  name: "Expansion of Wiz Streng",
  sound: 'Sound/SwellofMagicPower', // Expansion of Wizardry Str (WSclient.cpp:4950-4964)
  clip: { ground: A.PLAYER_SKILL_SWELL_OF_MP }, // Expansion of Wizardry Str
  light: { enhanced: SWELL_LIGHT },
});
