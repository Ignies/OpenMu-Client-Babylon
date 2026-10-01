import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 516,
  name: "Earthshake Mastery",
  sound: 'Sound/sDarkEarthQuake', // Earthshake Mastery
  delayMs: 10000, // Earthshake Mastery
  clip: { ground: A.PLAYER_ATTACK_DARKHORSE }, // Earthshake Mastery
});
