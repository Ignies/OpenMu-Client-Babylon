import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 140,
  name: 'Shadow Knight',
  // Its Die branch drops the shadow (GMSwampOfQuiet.cpp:902).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
