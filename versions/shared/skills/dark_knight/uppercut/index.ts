import { defineSkill } from '@/controllers/skills/define';
import { type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { atSwordBlow, litBlow, swordSpark } from '../_shared';

import { A } from '@/controllers/combat/recipes';

const UPPER_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.45, dir1: [-0.7, 3, -0.7], dir2: [0.7, 5.5, 0.7], power: 1, gravity: -11, capacity: 96 };

export default defineSkill({
  id: 21,
  name: "Uppercut",
  visual: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(UPPER_CHIPS) } },
  sound: 'Sound/sKnightSkill3', // Uppercut
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD3 }, // Uppercut
});
