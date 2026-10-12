import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 465,
  Name: 'Santa Claus',
  // Santa Village (`CGMSantaTown::CreateMonster`, GMSantaTown.cpp:55-58; Npc/npcsanta, ZzzOpenData.cpp:2161).
  // Not drawn yet: the three light sprites on bones 4, 13 and 38 (ZzzObject.cpp:1930-1945).
  npcModel: { file: 'npcsanta', scale: 1.7, idle: { base: 0, stay: [2, 3], others: [1, 2], backFrom: [1, 2] } },
});
