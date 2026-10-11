import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 147,
  name: 'Ice Giant',
  // Its Die branch drops the shadow (GM_Raklion.cpp:1830).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
