import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 133,
  name: 'Totem Golem',
  // Its Die branch drops the shadow (GMNewTown.cpp:1057).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
