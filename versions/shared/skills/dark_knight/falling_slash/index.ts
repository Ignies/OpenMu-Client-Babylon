import { defineSkill } from '@/controllers/skills/define';
import { type ParticleRecipe } from '@/controllers/fx/core';
import { RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { atSwordBlow, litBlow, swordSpark } from '../_shared';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** Enhanced: the blow's chips (Spark02, as CreateSpark's) off the blow, thrown the way each blade travels: Falling Slash low and wide, Lunge flat and fast, Uppercut a tall fountain. */
const FALLING_CHIPS: ParticleRecipe = { ...STEEL_GLINTS, texture: TEX.spark2, colour: RGBS.white, size: 0.07, life: 0.4, dir1: [-1.3, -0.2, -1.3], dir2: [1.3, 1.2, 1.3], power: 2.4, gravity: -7, capacity: 96 };

export default defineSkill({
  id: 19,
  name: "Falling Slash",
  // 19 Falling Slash / 20 Lunge / 21 Uppercut: the SWORD1..3 clip and its weapon trail (weaponTrailSystem),
  // then CreateSpark at the blow (ZzzCharacter.cpp:4884). The hero's blade-tip glint (SkillCast.cpp:374) is the cast's, not the row's.
  visual: { impact: atSwordBlow(swordSpark), enhanced: { impact: litBlow(FALLING_CHIPS) } },
  sound: 'Sound/sKnightSkill1', // Falling Slash
  // The default branch is PLAYER_ATTACK_SKILL_SWORD1 + baseSkill - FALLING_SLASH.
  // 19-21: ReceiveMagic sets the sword clip for every caster, the hero's echo too, with no mount
  // branch (WSclient.cpp:4370-4388), so UseSkillWarrior's Fenrir clip lasts one round trip.
  clip: { ground: A.PLAYER_ATTACK_SKILL_SWORD1 }, // Falling Slash
  // Falling Slash / Lunge / Uppercut: CreateSpark lights nothing. Enhanced: the blow flash, on the target.
  light: { enhanced: { strike: effectLight([0.9, 0.95, 1], 0.9, 0.25) } },
});
