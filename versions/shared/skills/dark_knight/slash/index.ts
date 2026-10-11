import { defineSkill } from '@/controllers/skills/define';
import { type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { atSwordBlow, litBlow, swordSpark } from '../_shared';

import { A } from '@/controllers/combat/recipes';
import type { PoseClip } from '@/controllers/combat';

/**
 * AT_SKILL_SLASH / _STR: ReceiveMagic swings SWORD5 (the clip) on an even SwordCount and TWO_HAND_SWORD3 on an
 * odd one, then advances it (WSclient.cpp:4398-4410).
 */
export const slashOddSwing: PoseClip = pose => (pose.swordCount % 2 === 1 ? A.PLAYER_ATTACK_TWO_HAND_SWORD3 : null);

import { effectLight } from '@/controllers/lighting/recipes';

const SLASH_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.45, dir1: [-1.8, 0.8, -1.8], dir2: [1.8, 2.6, 1.8], power: 2, gravity: -9, capacity: 96 };

export default defineSkill({
  id: 23,
  name: "Slash",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [327],
  poseClip: slashOddSwing,
  swordCount: true,
  // 23 Slash (327 by alias): the same on the even SWORD5 swing; atSwordBlow drops the odd
  // TWO_HAND_SWORD3 swing, which gets no CreateSpark (WSclient.cpp:4398-4410, ZzzCharacter.cpp:4884). Enhanced: likewise.
  visual: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(SLASH_CHIPS) } },
  sound: 'Sound/sKnightSkill4', // Slash
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD5 }, // Slash
  light: { enhanced: { strike: effectLight([0.9, 0.95, 1], 0.9, 0.25) } },
});
