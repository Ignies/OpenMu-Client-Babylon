import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 118,
  name: 'Maya Hand Left',
  // `m_bRenderShadow = false` every frame (GM_Kanturu_3rd.cpp:1091).
  classicShadow: 'never',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
