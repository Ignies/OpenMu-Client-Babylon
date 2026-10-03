import { defineSkill } from '@/controllers/skills/define';
import { type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { atSwordBlow, litBlow, swordSpark } from '../_shared';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** Cyclone's spin sprays its chips in a flat ring all round; Slash's big cut throws a wide fan up and over. */
const CYCLONE_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.4, dir1: [-2.6, 0, -2.6], dir2: [2.6, 0.7, 2.6], power: 2.4, gravity: -5, capacity: 96 };

export default defineSkill({
  id: 22,
  name: "Cyclone",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [326],
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [479],
  // 22 Cyclone (326 by alias): the SWORD4 clip, its weapon trail and CreateSpark at the blow, as 19-21;
  // the name has no effect of its own (WSclient.cpp:4390-4396, ZzzCharacter.cpp:4884). Enhanced: 19-21's lit blow.
  visual: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(CYCLONE_CHIPS) } },
  sound: 'Sound/sKnightSkill4', // Cyclone
  // 22 / 23 likewise (WSclient.cpp:4390-4410); Slash's odd swing is its own poseClip (slash/index.ts).
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD4 }, // Cyclone
  // Cyclone / Slash (326 / 327 through their base): the same blow flash, the same light.
  light: { enhanced: { strike: effectLight([0.9, 0.95, 1], 0.9, 0.25) } },
});
