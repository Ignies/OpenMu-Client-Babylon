import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 544,
  Name: 'Gens Vanert Steward',
  // Gens steward (ZzzCharacter.cpp:14970-14981, models ZzzOpenData.cpp:2189-2196).
  npcModel: { file: 'barnert', scale: 1 },
});
