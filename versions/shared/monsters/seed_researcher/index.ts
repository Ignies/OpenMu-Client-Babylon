import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 453,
  Name: 'Seed Researcher',
  // Cherry-blossom event (ZzzCharacter.cpp:14428-14447, models ZzzOpenData.cpp:2093-2098).
  npcModel: { file: 'seedgoblin', scale: 0.9, idle: { base: 0, stay: [2, 3], others: [1, 1], backFrom: [1] } },
});
