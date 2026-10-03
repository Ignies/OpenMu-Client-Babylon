import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 385,
  Name: 'Mirage',
  // Cursed Temple (w_CursedTemple.cpp:164-215).
  npcModel: { file: 'mirazu', scale: 0.95 },
});
