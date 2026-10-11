import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 216,
  name: 'Nacondra',
  // Its Die branch drops the shadow (GMKarutan1.cpp:534).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
