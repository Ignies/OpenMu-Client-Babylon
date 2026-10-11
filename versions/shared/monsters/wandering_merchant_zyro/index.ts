import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 568,
  Name: 'Wandering Merchant Zyro',
  // MODEL_GAMBLE_NPC_MOSS at 0.8 with its six clips at PlaySpeed 0.33, the same as Moss
  // (ZzzCharacter.cpp:14505-14516). Its edge scale is not modelled.
  npcModel: { file: 'gambler_moss', scale: 0.8, clipSpeeds: { 0: 0.33, 1: 0.33, 2: 0.33, 3: 0.33, 4: 0.33, 5: 0.33 } },
});
