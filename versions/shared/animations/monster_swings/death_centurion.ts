import { defineMonsterSwing } from '@/controllers/anim';
import { MonsterActionType as A } from '@versions/shared/objects/enum';

// SetCurrentAction_HellasMonster (GMHellas.cpp:960): the Death Centurions of Kalima 1-6, on any map.
export default defineMonsterSwing({
  name: 'death_centurion',
  monsters: [145, 175, 183, 191, 261, 269],
  // Energy Ball, Fire Slash (+ STR), Poison (+ STR), Summon Monster and the two immunities.
  bySkill: { 17: A.Attack2, 55: A.Attack2, 490: A.Attack2, 1: A.Attack2, 384: A.Attack2, 200: A.Attack2, 201: A.Attack2, 202: A.Attack2 },
  otherwise: A.Attack1,
});
