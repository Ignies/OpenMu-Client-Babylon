import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 468,
  Name: 'Dasher',
  // One of the eight Little Santas (ZzzCharacter.cpp:14515-14544), all on Npc/xmassanta
  // (ZzzOpenData.cpp:2118). Their colour (a texture swap) and per-action play speeds
  // (0.4 standing, 0.5 idling) are not modelled.
  npcModel: { file: 'xmassanta', scale: 0.43, idle: { base: 0, stay: [2, 5], others: [2, 3] } },
});
