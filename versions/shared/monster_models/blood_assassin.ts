import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 160,
  name: 'Blood Assassin',
  // Its Die branch drops the shadow (GM_PK_Field.cpp:701).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
