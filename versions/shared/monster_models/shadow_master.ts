import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 203,
  name: 'Shadow Master',
  // Its Die branch drops the shadow (GMSwampOfQuiet.cpp:1207).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
