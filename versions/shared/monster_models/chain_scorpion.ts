import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 20,
  name: 'Chain Scorpion',
  voices: ['Sound/mScorpion1', 'Sound/mScorpion2', 'Sound/mScorpionAttack1', 'Sound/mScorpionAttack2', 'Sound/mScorpionDie'],
  clipSpeeds: { [M.Walk]: 0.4 },
});
