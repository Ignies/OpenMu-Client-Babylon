import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 579,
  Name: 'David',
  // Lucky-item NPC David (ZzzCharacter.cpp:14450-14456).
  npcModel: { file: 'LuckyItem/npc_burial', scale: 0.95, idle: { base: 0, stay: [4, 5], others: [1, 1], backFrom: [1] } },
});
