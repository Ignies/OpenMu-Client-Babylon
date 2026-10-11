import { defineMonsterModel } from '@/controllers/monsters';

// hand-ported (ZzzOpenData.cpp:3906)
export default defineMonsterModel({
  type: 76,
  name: 'Battle Guard1',
  voices: [null, null, 'Sound/battlecastle/mBowMercAttack', 'Sound/battlecastle/mBowMercAttack', 'Sound/battlecastle/mBowMercDeath'],
});
