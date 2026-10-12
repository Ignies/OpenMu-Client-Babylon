import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 467,
  Name: 'Snowman',
  // Santa Village (`CGMSantaTown::CreateMonster`, GMSantaTown.cpp:58-69).
  // Its light sprites on bones 7 and 34 are a glow row (controllers/fx/monsterGlow.ts); the BITMAP_SHINY
  // particle on bone 34 is not made yet (ZzzObject.cpp:1910-1922).
  npcModel: { file: 'snowman', scale: 1.3, idle: { base: 0, stay: [1, 1], others: [0, 1] } },
});
