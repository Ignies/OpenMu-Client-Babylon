import { defineSkill } from '@/controllers/skills/define';
import { type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { atSwordBlow, litBlow, swordSpark } from '../_shared';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

const LUNGE_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.3, dir1: [-2.2, 0.2, -2.2], dir2: [2.2, 1, 2.2], power: 2.2, gravity: -4, capacity: 96 };

export default defineSkill({
  id: 20,
  name: "Lunge",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [329],
  visual: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(LUNGE_CHIPS) } },
  sound: 'Sound/sKnightSkill2', // Lunge
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD2 }, // Lunge
  light: { enhanced: { strike: effectLight([0.9, 0.95, 1], 0.9, 0.25) } },
});
