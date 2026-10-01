import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';

import { INFERNO_LIGHT } from './';

export default defineSkill({
  id: 486,
  name: "Inferno Strengthener",
  clip: { ground: A.PLAYER_SKILL_INFERNO }, // Inferno Str (Duel Master)
  light: INFERNO_LIGHT,
});
