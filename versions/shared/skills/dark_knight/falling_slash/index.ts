import { defineSkill } from '@/controllers/skills/define';
import { type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { atSwordBlow, litBlow, swordSpark } from '../_shared';

/** Enhanced: the blow's chips (Spark02, as CreateSpark's) off the blow, thrown the way each blade travels: Falling Slash low and wide, Lunge flat and fast, Uppercut a tall fountain. */
const FALLING_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.4, dir1: [-1.3, -0.2, -1.3], dir2: [1.3, 1.2, 1.3], power: 2.4, gravity: -7, capacity: 96 };

export default defineSkill({
  id: 19,
  name: "Falling Slash",
  // 19 Falling Slash / 20 Lunge / 21 Uppercut: the SWORD1..3 clip and its weapon trail (weaponTrailSystem),
  // then CreateSpark at the blow (ZzzCharacter.cpp:4884). The hero's blade-tip glint (SkillCast.cpp:374) is the cast's, not the row's.
  visual: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(FALLING_CHIPS) } },
});
