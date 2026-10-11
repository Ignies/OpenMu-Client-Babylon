import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 535,
  Name: 'Doppelganger Knight',
  // GMDoppelGanger1.cpp:91-163.
  gear: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: 1, // Dragon
    mainHand: { group: 0, num: 13 }, // Double Blade
    scale: 1,
  },
});
