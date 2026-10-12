import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 465,
  Name: 'Santa Claus',
  // Santa Village (`CGMSantaTown::CreateMonster`, GMSantaTown.cpp:55-58; Npc/npcsanta, ZzzOpenData.cpp:2161).
  // Its light sprites on bones 4, 13 and 38 are a glow row (controllers/fx/monsterGlow.ts). Not drawn yet: the
  // BITMAP_LIGHTMARKS auroras, the 11 twinkling lights and the per-action particles (ZzzObject.cpp:1946-2010).
  npcModel: { file: 'npcsanta', scale: 1.7, idle: { base: 0, stay: [2, 3], others: [1, 2], backFrom: [1, 2] } },
});
