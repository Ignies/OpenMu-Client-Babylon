import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 67,
  name: 'Death Centurion',
  voices: ['Sound/mDsIdle1', 'Sound/mDsIdle2', 'Sound/mDsAttack1', 'Sound/mDsAttack2', 'Sound/mDsDeath'],
  subType9Voices: ['Sound/mLsIdle1', 'Sound/mLsIdle2', 'Sound/mLsAttack1', 'Sound/mLsAttack2', 'Sound/mLsDeath'],
  clipSpeeds: { [M.Attack1]: 0.2, [M.Attack2]: 0.3 },
});
