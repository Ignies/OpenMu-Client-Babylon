import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 467,
  Name: 'Snowman',
  // Santa Village (`CGMSantaTown::CreateMonster`, GMSantaTown.cpp:58-69).
  npcModel: { file: 'snowman', scale: 1.3 },
});
