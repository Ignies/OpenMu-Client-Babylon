import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 492,
  Name: 'Moss',
  // MODEL_GAMBLE_NPC_MOSS at 0.8 with its six clips at PlaySpeed 0.33 (ZzzCharacter.cpp:14846-14859).
  npcModel: { file: 'gambler_moss', scale: 0.8, clipSpeeds: { 0: 0.33, 1: 0.33, 2: 0.33, 3: 0.33, 4: 0.33, 5: 0.33 }, idle: { base: 0, stay: [4, 5], others: [1, 1], backFrom: [1] } },
});
