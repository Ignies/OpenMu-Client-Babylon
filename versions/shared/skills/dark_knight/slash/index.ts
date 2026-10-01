import { defineSkill } from '@/controllers/skills/define';
import { type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { atSwordBlow, litBlow, swordSpark } from '../_shared';

import { A } from '@/controllers/combat/recipes';

const SLASH_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.45, dir1: [-1.8, 0.8, -1.8], dir2: [1.8, 2.6, 1.8], power: 2, gravity: -9, capacity: 96 };

export default defineSkill({
  id: 23,
  name: "Slash",
  // 23 Slash (327 by alias): the same on the even SWORD5 swing; atSwordBlow drops the odd
  // TWO_HAND_SWORD3 swing, which gets no CreateSpark (WSclient.cpp:4398-4410, ZzzCharacter.cpp:4884). Enhanced: likewise.
  visual: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(SLASH_CHIPS) } },
  sound: 'Sound/sKnightSkill4', // Slash
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD5 }, // Slash
});
