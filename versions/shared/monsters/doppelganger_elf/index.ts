import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 534,
  Name: 'Doppelganger Elf',
  // GMDoppelGanger1.cpp:91-163.
  gear: {
    charClass: CharacterClassNumber.FairyElf,
    playerClass: PlayerClass.FairyElf,
    set: 13, // Spirit
    mainHand: { group: 4, num: 15 }, // Arrows
    offHand: { group: 4, num: 17 }, // Celestial Bow
    scale: 1,
  },
});
