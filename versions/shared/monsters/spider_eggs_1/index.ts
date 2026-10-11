import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 460,
  Name: 'Spider Eggs',
  // Created with `m_bRenderShadow = false` (GM_Raklion.cpp:162).
  classicShadow: false,
  maxHealth: 40000,
  model: { type: 151, scale: 0.3 },
});
