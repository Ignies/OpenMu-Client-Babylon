import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 52,
  name: 'Crust',
  voices: ['Sound/mMegaCrust1', 'Sound/mMegaCrust1', 'Sound/mMegaCrustAttack1', 'Sound/mMegaCrustAttack1', 'Sound/mMegaCrustDie'],
  // `Speed = 0.07f` and `SetPlayerStop` for MODEL_CRUST (ZzzCharacter.cpp:3147-3150, :3185).
  slide: { speed: 0.07, stops: true },
});
