import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 416,
  Name: 'Rhea',
  // Elbeland shop NPC (GMNewTown.cpp:863-885).
  npcModel: { file: 'rhea', scale: 1 },
});
