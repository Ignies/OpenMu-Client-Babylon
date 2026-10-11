import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 161,
  name: 'Cruel Blood Assassin',
  // Its Die branch drops the shadow (GM_PK_Field.cpp:701).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
