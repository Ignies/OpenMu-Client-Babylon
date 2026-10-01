import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

import { SWELL_LIGHT } from './';

export default defineSkill({
  id: 383,
  name: "Expansion of Wiz Mas",
  sound: 'Sound/SwellofMagicPower', // Expansion of Wizardry Mastery
  clip: { ground: A.PLAYER_SKILL_SWELL_OF_MP }, // Expansion of Wizardry Mastery
  light: { enhanced: SWELL_LIGHT },
  target: 'self',
});
