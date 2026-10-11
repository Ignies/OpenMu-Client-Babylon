import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 30,
  name: 'Death Cow',
  // Death Cow: one MODEL_BONE1 skull and ten MODEL_BONE2 (ZzzCharacter.cpp:1397-1405).
  shatter: 'bone',
  voices: ['Sound/mBull1', 'Sound/mBull2', 'Sound/mBullAttack1', 'Sound/mBullAttack2', 'Sound/mBullDie'],
});
