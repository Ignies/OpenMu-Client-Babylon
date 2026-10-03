import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 247,
  Name: 'Crossbow Guard',
  maxHealth: 10000,
  // Town guard (ZzzCharacter.cpp:14464-14494): the plate set, told apart by what it carries.
  gear: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: 9, // Plate
    mainHand: { group: 4, num: 11 }, // Light Crossbow
    offHand: { group: 4, num: 7 }, // Bolt
  },
  stats: {
    Rate: 1,
    Level: 90,
    HP: 10000,
    MP: 0,
    MinDmg: 180,
    MaxDmg: 195,
    Def: 70,
    MagDef: 20,
    AttackSuccess: 300,
    Move: 100,
    AttType: 5,
    Range: 0,
    View: 2,
    MoveSpeed: 2,
    AttSpeed: 400,
    Regen: 1500,
    Attri: 10,
    ItemR: 1,
    MoneyR: 200,
    MaxI: 10,
    ResWind: 0,
    ResPois: 0,
    ResIce: 0,
    ResWater: 0,
    ResFire: 0,
  },
});
