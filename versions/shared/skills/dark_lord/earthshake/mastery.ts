import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

import { EARTHSHAKE_LIGHT } from './';

export default defineSkill({
  id: 516,
  name: "Earthshake Mastery",
  sound: 'Sound/sDarkEarthQuake', // Earthshake Mastery
  delayMs: 10000, // Earthshake Mastery
  clip: { ground: A.PLAYER_ATTACK_DARKHORSE }, // Earthshake Mastery
  light: EARTHSHAKE_LIGHT,
});
