import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 206,
  name: 'Dark Giant',
  // Its Die branch drops the shadow (GM_Raklion.cpp:2086).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
