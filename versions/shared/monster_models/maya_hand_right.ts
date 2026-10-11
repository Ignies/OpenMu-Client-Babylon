import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 119,
  name: 'Maya Hand Right',
  // `m_bRenderShadow = false` every frame (GM_Kanturu_3rd.cpp:1154).
  classicShadow: 'never',
  voices: [null, null, null, null, null], // voiced in mapMonsters.ts
});
