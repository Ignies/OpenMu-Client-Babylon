import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

// hand-ported: SetMonsterSound 232, 232, 233, 234, -1 (ZzzOpenData.cpp:3587-3592);
// his collapse is a render hook, in mapMonsters.ts
export default defineMonsterModel({
  type: 64,
  name: 'Illusion Of Kundun',
  voices: ['Sound/mKundunIdle', 'Sound/mKundunIdle', 'Sound/mKundunAttack1', 'Sound/mKundunAttack2', null],
  clipSpeeds: { [M.Attack1]: 0.3, [M.Attack2]: 0.25, [M.Shock]: 0.15, [M.Die]: 0.25 },
});
