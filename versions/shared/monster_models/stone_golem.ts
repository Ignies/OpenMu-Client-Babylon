import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 25,
  name: 'Stone Golem',
  // Stone Golem: 8 + 8 MODEL_BIG_STONE1/2 (ZzzCharacter.cpp:1407-1416).
  shatter: 'stone',
  voices: ['Sound/mGolem1', 'Sound/mGolem2', 'Sound/mGolemAttack1', 'Sound/mGolemAttack2', 'Sound/mGolemDie'],
  speedScale: 0.7,
});
