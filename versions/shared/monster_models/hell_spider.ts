import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 8,
  name: 'Hell Spider',
  voices: ['Sound/mHellSpider1', 'Sound/mHellSpiderAttack1', 'Sound/mHellSpiderAttack1', 'Sound/mHellSpiderAttack1', 'Sound/mHellSpiderDie'],
  clipSpeeds: { [M.Walk]: 0.7 },
});
