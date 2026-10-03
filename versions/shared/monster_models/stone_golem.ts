import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 25,
  name: 'Stone Golem',
  voices: ['Sound/mGolem1', 'Sound/mGolem2', 'Sound/mGolemAttack1', 'Sound/mGolemAttack2', 'Sound/mGolemDie'],
  speedScale: 0.7,
});
