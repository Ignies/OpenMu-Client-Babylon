import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 0,
  name: 'Bull Fighter',
  voices: ['Sound/mBull1', 'Sound/mBull2', 'Sound/mBullAttack1', 'Sound/mBullAttack2', 'Sound/mBullDie'],
});
