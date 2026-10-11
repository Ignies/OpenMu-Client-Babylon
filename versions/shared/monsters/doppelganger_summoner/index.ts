import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 539,
  Name: 'Doppelganger Summoner',
  // GMDoppelGanger1.cpp:91-163.
  gear: {
    charClass: CharacterClassNumber.Summoner,
    playerClass: PlayerClass.Summoner,
    set: 40, // Red Wing
    mainHand: { group: 5, num: 18 }, // Demonic Stick
    scale: 1,
  },
});
