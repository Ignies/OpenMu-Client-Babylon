import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 44,
  name: 'Beam Knight',
  voices: ['Sound/death1', 'Sound/death1', 'Sound/death_attack1', 'Sound/death_attack1', 'Sound/death_die'],
  clipSpeeds: { [M.Die]: 0.3 },
});
