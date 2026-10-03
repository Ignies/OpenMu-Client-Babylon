import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 9,
  name: 'Spider',
  voices: ['Sound/mSpider1', 'Sound/mSpider1', 'Sound/mSpider1', 'Sound/mSpider1', 'Sound/mSpider1'],
  clipSpeeds: { [M.Walk]: 1.2 },
});
