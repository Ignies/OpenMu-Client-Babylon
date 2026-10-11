import { defineMonsterModel } from '@/controllers/monsters';

// hand-ported (ZzzOpenData.cpp:3911)
export default defineMonsterModel({
  type: 77,
  name: 'Battle Guard2',
  voices: [null, null, 'Sound/battlecastle/mSpearMercAttack', 'Sound/battlecastle/mSpearMercAttack', 'Sound/battlecastle/mSpearMercDeath'],
});
