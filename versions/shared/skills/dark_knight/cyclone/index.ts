import { defineSkill } from '@/controllers/skills/define';
import { type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { atSwordBlow, litBlow, swordSpark } from '../_shared';

/** Cyclone's spin sprays its chips in a flat ring all round; Slash's big cut throws a wide fan up and over. */
const CYCLONE_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.4, dir1: [-2.6, 0, -2.6], dir2: [2.6, 0.7, 2.6], power: 2.4, gravity: -5, capacity: 96 };

export default defineSkill({
  id: 22,
  name: "Cyclone",
  // 22 Cyclone (326 by alias): the SWORD4 clip, its weapon trail and CreateSpark at the blow, as 19-21;
  // the name has no effect of its own (WSclient.cpp:4390-4396, ZzzCharacter.cpp:4884). Enhanced: 19-21's lit blow.
  visual: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(CYCLONE_CHIPS) } },
});
