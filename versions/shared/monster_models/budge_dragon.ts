import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 2,
  name: 'Budge Dragon',
  voices: ['Sound/mBudge1', 'Sound/mBudgeAttack1', 'Sound/mBudgeAttack1', 'Sound/mBudgeAttack1', 'Sound/mBudgeDie'],
  clipSpeeds: { [M.Walk]: 0.7 },
});
