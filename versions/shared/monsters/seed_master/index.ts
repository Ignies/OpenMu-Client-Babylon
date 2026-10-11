import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 452,
  Name: 'Seed Master',
  // Cherry-blossom event (ZzzCharacter.cpp:14428-14447, models ZzzOpenData.cpp:2093-2098).
  npcModel: { file: 'goblinmaster', scale: 1.1 },
});
