import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 5,
  name: 'Giant',
  voices: ['Sound/mGiant1', 'Sound/mGiant2', 'Sound/mGiantAttack1', 'Sound/mGiantAttack2', 'Sound/mGiantDie'],
  speedScale: 0.7,
});
