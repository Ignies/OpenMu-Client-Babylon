import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 469,
  Name: 'Kermit',
  // One of the eight Little Santas (ZzzCharacter.cpp:14515-14544), all on Npc/xmassanta
  // (ZzzOpenData.cpp:2118), each clip at its case's PlaySpeed (ZzzCharacter.cpp:14815-14828).
  // Their colour (a texture swap) is not modelled.
  npcModel: { file: 'xmassanta', scale: 0.43, clipSpeeds: { 0: 0.4, 1: 0.4, 2: 0.5, 3: 0.5, 4: 0.4 }, idle: { base: 0, stay: [2, 5], others: [2, 3] } },
});
