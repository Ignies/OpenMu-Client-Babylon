import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

// hand-ported (ZzzOpenData.cpp:3537)
export default defineMonsterModel({
  type: 13,
  name: 'Elite Yeti',
  voices: ['Sound/mYeti1', 'Sound/mYeti2', 'Sound/mYetiAttack1', 'Sound/mYetiAttack1', 'Sound/mYetiDie'],
  clipSpeeds: { [M.Walk]: 0.28 },
});
