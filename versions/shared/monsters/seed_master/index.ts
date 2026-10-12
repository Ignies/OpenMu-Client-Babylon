import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 452,
  Name: 'Seed Master',
  // Cherry-blossom event (ZzzCharacter.cpp:14428-14447, models ZzzOpenData.cpp:2093-2098).
  npcModel: { file: 'goblinmaster', scale: 1.1, idle: { base: 0, stay: [2, 3], others: [1, 3], backFrom: [1, 2, 3] } },
});
