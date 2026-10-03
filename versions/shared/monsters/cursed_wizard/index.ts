import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 34,
  Name: 'Cursed Wizard',
  maxHealth: 4000,
  // ZzzCharacter.cpp:13907-13931: a player rig in Legendary +9 with the Legendary Staff and Shield;
  // the rig's class is CLASS_WIZARD (CreateCharacterPointer, :11732-11735). Not modelled: the red
  // PVP_MURDERER2 body (:13925) and the class scale (SetCharacterScale, 1.0 in Devil Square).
  gear: {
    charClass: CharacterClassNumber.DarkWizard,
    playerClass: PlayerClass.DarkWizard,
    set: 3, // Legendary
    level: 9,
    mainHand: { group: 5, num: 5 }, // MODEL_LEGENDARY_STAFF
    offHand: { group: 6, num: 14 }, // MODEL_LEGENDARY_SHIELD
  },
  stats: {
    Rate: 1,
    Level: 54,
    HP: 4000,
    MP: 0,
    MinDmg: 160,
    MaxDmg: 170,
    Def: 95,
    MagDef: 0,
    AttackSuccess: 270,
    Move: 80,
    AttType: 3,
    Range: 3,
    View: 4,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 2000,
    Attri: 10,
    ItemR: 2,
    MoneyR: 200,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 5,
    ResWater: 5,
    ResFire: 7,
  },
});
