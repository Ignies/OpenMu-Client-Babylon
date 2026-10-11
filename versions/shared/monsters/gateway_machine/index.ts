import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 367,
  Name: 'Gateway Machine',
  // Kanturu 2nd gateway machine (GM_Kanturu_2nd.cpp:106-118).
  npcModel: { file: 'to3gate', scale: 4.76 },
  // It fills the tiles around it: talked to from within 550 units (ZzzInterface.cpp:3215-3233).
  talkRange: 5.5,
});
