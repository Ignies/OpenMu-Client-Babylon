import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 536,
  Name: 'Doppelganger Wizard',
  // GMDoppelGanger1.cpp:91-163.
  gear: {
    charClass: CharacterClassNumber.DarkWizard,
    playerClass: PlayerClass.DarkWizard,
    set: 18, // Grand Soul
    mainHand: { group: 5, num: 9 }, // Dragon Soul Staff
    offHand: { group: 6, num: 15 }, // Grand Soul Shield
    scale: 1,
  },
});
