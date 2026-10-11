import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 141,
  name: 'Shadow Look',
  // Its Die branch drops the shadow (GMSwampOfQuiet.cpp:945).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
