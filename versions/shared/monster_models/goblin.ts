import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 19,
  name: 'Goblin',
  voices: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  clipSpeeds: { [M.Walk]: 0.6 },
});
