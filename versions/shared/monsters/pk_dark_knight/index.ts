import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 297,
  Name: 'PK Dark Knight',
  // GMHuntingGround.cpp:279-298. `Skin = 1` and `PK = PVP_MURDERER2` (the red name) are not
  // modelled; neither changes the mesh.
  gear: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: 1, // Dragon
    level: 9,
    mainHand: { group: 0, num: 16 }, // Sword of Destruction
    offHand: { group: 6, num: 13 }, // Dragon Shield
  },
});
