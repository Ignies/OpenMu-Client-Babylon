import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 22,
  name: 'Hunter',
  voices: ['Sound/mHunter1', 'Sound/mHunter2', 'Sound/mHunterAttack1', 'Sound/mHunterAttack2', 'Sound/mHunterDie'],
});
