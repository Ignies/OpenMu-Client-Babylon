import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 1,
  name: 'Hound',
  voices: ['Sound/mHound1', 'Sound/mHound2', 'Sound/mHoundAttack1', 'Sound/mHoundAttack2', 'Sound/mHoundDie'],
});
