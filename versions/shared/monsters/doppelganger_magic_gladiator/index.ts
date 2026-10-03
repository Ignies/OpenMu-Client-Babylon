import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 537,
  Name: 'Doppelganger Magic Gladiator',
  // GMDoppelGanger1.cpp:91-163.
  // The helm is `MODEL_BODY_HELM + 15`: the Storm Crow set ships no helm item, so items.json has
  // no group-7 row 15 to name and the part is left off.
  gear: {
    charClass: CharacterClassNumber.MagicGladiator,
    playerClass: PlayerClass.MagicGladiator,
    set: 15, // Storm Crow
    noHelm: true,
    mainHand: { group: 0, num: 31 }, // Rune Blade
    scale: 1,
  },
});
