import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 15,
  name: 'Ice Monster',
  // Ice Monster: ten MODEL_ICE_SMALL shards for blood (CreateBlood, ZzzEffectBlurSpark.cpp:445-450).
  shatter: 'ice',
  voices: ['Sound/mIceMonster1', 'Sound/mIceMonster2', 'Sound/mIceMonster1', 'Sound/mIceMonster1', 'Sound/mIceMonsterDie'],
});
