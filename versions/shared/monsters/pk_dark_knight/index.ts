import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 297,
  Name: 'PK Dark Knight',
  // GMHuntingGround.cpp:288-306. `PK = PVP_MURDERER2` (the red name) is not modelled.
  gear: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: 1, // Dragon
    level: 9,
    mainHand: { group: 0, num: 16 }, // Sword of Destruction
    offHand: { group: 6, num: 13 }, // Dragon Shield
    scale: 0.93, // `Skin = 1` (:291): SetCharacterScale's second row (ZzzCharacter.cpp:12157)
  },
});
