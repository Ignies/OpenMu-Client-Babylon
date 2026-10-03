import { defineMonsterSwing } from '@/controllers/anim';
import { MonsterActionType as A } from '@versions/shared/objects/enum';

// SetCurrentAction_HellasMonster (GMHellas.cpp:960): the Necrons of Kalima 1-6, on any map.
export default defineMonsterSwing({
  name: 'necron',
  monsters: [149, 179, 187, 195, 265, 273],
  // Poison (+ STR) and Energy Ball; any other skill sets no clip.
  bySkill: { 1: A.Attack2, 384: A.Attack2, 17: A.Attack1 },
  otherwise: 'keep',
});
