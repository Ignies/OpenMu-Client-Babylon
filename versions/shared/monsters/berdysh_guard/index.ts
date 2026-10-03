import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 249,
  Name: 'Berdysh Guard',
  maxHealth: 10000,
  // Town guard (ZzzCharacter.cpp:14464-14494): the plate set, told apart by what it carries.
  gear: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: 9, // Plate
    mainHand: { group: 3, num: 7 }, // Berdysh
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
    View: 5,
    MoveSpeed: 5,
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
