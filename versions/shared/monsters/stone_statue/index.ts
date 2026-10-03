import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 380,
  Name: 'Stone Statue',
  // Cursed Temple (w_CursedTemple.cpp:164-215).
  npcModel: { file: 'songsom', scale: 1 },
});
