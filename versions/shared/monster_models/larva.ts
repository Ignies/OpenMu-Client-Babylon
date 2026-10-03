import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 6,
  name: 'Larva',
  voices: ['Sound/mLarva1', 'Sound/mLarva2', 'Sound/mLarva1', 'Sound/mLarva2', 'Sound/mLarva2'],
  clipSpeeds: { [M.Walk]: 0.6 },
});
