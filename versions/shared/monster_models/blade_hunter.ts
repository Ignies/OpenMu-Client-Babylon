import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 110,
  name: 'Blade Hunter',
  // Its Die branch drops the shadow (GM_Kanturu_1st.cpp:986).
  classicShadow: 'alive',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
