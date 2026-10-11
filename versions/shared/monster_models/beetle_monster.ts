import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 21,
  name: 'Beetle Monster',
  voices: ['Sound/mBeetle1', 'Sound/mBeetle1', 'Sound/mBeetleAttack1', 'Sound/mBeetleAttack1', 'Sound/mBeetleDie'],
  clipSpeeds: { [M.Walk]: 0.5 },
});
