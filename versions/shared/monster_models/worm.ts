import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 17,
  name: 'Worm',
  voices: ['Sound/mWorm1', 'Sound/mWorm1', 'Sound/mWormDie', 'Sound/mWormDie', 'Sound/mWormDie'],
  clipSpeeds: { [M.Walk]: 0.5 },
});
