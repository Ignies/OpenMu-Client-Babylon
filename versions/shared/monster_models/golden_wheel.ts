import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 41,
  name: 'Golden Wheel',
  voices: ['Sound/iron1', 'Sound/iron1', 'Sound/iron_attack1', 'Sound/iron_attack1', 'Sound/iron_attack1'],
  clipSpeeds: { [M.Walk]: 0.18 },
});
