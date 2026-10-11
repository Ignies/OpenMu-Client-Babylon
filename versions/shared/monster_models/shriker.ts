import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 69,
  name: 'Shriker',
  voices: ['Sound/mSvIdle1', 'Sound/mSvIdle2', 'Sound/mSvAttack1', 'Sound/mSvAttack2', 'Sound/mSvDeath'],
  subType9Voices: ['Sound/mLvIdle1', 'Sound/mLvIdle2', 'Sound/mLvAttack1', 'Sound/mLvAttack2', 'Sound/mLvDeath'],
  clipSpeeds: { [M.Die]: 0.1 },
});
