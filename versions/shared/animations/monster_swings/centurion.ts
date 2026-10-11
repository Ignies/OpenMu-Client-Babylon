import { defineMonsterSwing } from '@/controllers/anim';
import { MonsterActionType as A } from '@versions/shared/objects/enum';

// SetCurrentAction_HellasMonster (GMHellas.cpp:960): the Aegis and Rogue Centurions of Kalima 1-6, on any map.
export default defineMonsterSwing({
  name: 'centurion',
  monsters: [147, 177, 185, 193, 263, 271, 148, 178, 186, 194, 264, 272],
  // Energy Ball.
  bySkill: { 17: A.Attack2 },
  otherwise: A.Attack1,
});
