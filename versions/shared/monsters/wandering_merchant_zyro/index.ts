import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 568,
  Name: 'Wandering Merchant Zyro',
  // MODEL_GAMBLE_NPC_MOSS at 0.8, the same as Moss (ZzzCharacter.cpp:14505-14516). Its edge scale
  // and the clips slowed to 0.33 (:14514) are not modelled, as for Moss.
  npcModel: { file: 'gambler_moss', scale: 0.8 },
});
