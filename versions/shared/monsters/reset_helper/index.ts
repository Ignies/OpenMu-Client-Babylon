import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 464,
  Name: 'Reset Helper',
  // ZzzCharacter.cpp:14478-14495.
  gear: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: 9, // Plate
    mainHand: { group: 4, num: 11 }, // Light Crossbow
    offHand: { group: 4, num: 7 }, // Bolt
  },
});
