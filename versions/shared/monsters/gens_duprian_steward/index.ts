import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 543,
  Name: 'Gens Duprian Steward',
  // Gens steward (ZzzCharacter.cpp:14970-14981, models ZzzOpenData.cpp:2189-2196).
  npcModel: { file: 'duprian', scale: 1 },
});
