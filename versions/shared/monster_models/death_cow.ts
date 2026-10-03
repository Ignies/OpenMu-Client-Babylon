import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 30,
  name: 'Death Cow',
  voices: ['Sound/mBull1', 'Sound/mBull2', 'Sound/mBullAttack1', 'Sound/mBullAttack2', 'Sound/mBullDie'],
});
