import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 51,
  name: 'Queen Rainer',
  voices: ['Sound/mRainner1', null, 'Sound/mRainnerAttack1', 'Sound/mRainnerAttack1', 'Sound/mRainnerDie'],
});
