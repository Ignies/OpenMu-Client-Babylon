import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 115,
  name: 'Twin Tail',
  // Its Die branch drops the shadow (GM_Kanturu_2nd.cpp:996).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
