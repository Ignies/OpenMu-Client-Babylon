import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 467,
  Name: 'Snowman',
  // Santa Village (`CGMSantaTown::CreateMonster`, GMSantaTown.cpp:58-69).
  npcModel: { file: 'snowman', scale: 1.3, idle: { base: 0, stay: [1, 1], others: [0, 1] } },
});
