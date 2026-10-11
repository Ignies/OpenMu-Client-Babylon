import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 215,
  name: 'Condra',
  // Its Die branch drops the shadow (GMKarutan1.cpp:461).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
