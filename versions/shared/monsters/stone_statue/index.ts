import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 380,
  Name: 'Stone Statue',
  // Created with `m_bRenderShadow = false` (w_CursedTemple.cpp:170).
  classicShadow: false,
  // Cursed Temple (w_CursedTemple.cpp:164-215).
  npcModel: { file: 'songsom' },
});
