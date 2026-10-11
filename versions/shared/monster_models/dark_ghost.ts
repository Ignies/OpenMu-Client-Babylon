import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 175,
  name: 'Dark Ghost',
  // Its Die branch drops the shadow (GMEmpireGuardian2.cpp:945).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
