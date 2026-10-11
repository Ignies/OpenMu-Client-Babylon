import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 47,
  name: 'Orc',
  voices: ['Sound/mHunter2', 'Sound/mHunter2', 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', 'Sound/mBullDie'],
});
