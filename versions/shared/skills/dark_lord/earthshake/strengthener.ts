import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 512,
  name: "Earthshake Streng",
  sound: 'Sound/sDarkEarthQuake', // Earthshake Str
  clip: { ground: A.PLAYER_ATTACK_DARKHORSE }, // Earthshake Str
});
