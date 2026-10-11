import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 139,
  name: 'Shadow Pawn',
  // Its Die branch drops the shadow (GMSwampOfQuiet.cpp:859).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
