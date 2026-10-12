import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 415,
  Name: 'Silvia',
  // Elbeland shop NPC (GMNewTown.cpp:863-885).
  npcModel: { file: 'silvia', scale: 1, idle: { base: 0, stay: [4, 5], others: [1, 1], backFrom: [1] } },
});
