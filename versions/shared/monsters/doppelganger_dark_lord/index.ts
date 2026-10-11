import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 538,
  Name: 'Doppelganger Dark Lord',
  // GMDoppelGanger1.cpp:91-163.
  gear: {
    charClass: CharacterClassNumber.DarkLord,
    playerClass: PlayerClass.DarkLord,
    set: 27, // Dark Steel
    mainHand: { group: 2, num: 10 }, // Great Scepter
    offHand: { group: 6, num: 7 }, // Spiked Shield
    pet: { group: 13, num: 4 }, // Dark Horse
    scale: 1,
  },
});
