import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 229,
  Name: 'Malron',
  maxHealth: 50,
  // Marlon, the town scout (ZzzCharacter.cpp:14315-14333): the plate set at +7 and a +8 Berdysh.
  gear: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: 9, // Plate
    level: 7,
    mainHand: { group: 3, num: 7, lvl: 8 }, // Berdysh +8 (`c->Weapon[0].Level = 8`)
  },
  stats: {
    Rate: 1,
    Level: 2,
    HP: 50,
    MP: 0,
    MinDmg: 15,
    MaxDmg: 30,
    Def: 70,
    MagDef: 20,
    AttackSuccess: 10,
    Move: 30,
    AttType: 0,
    Range: 0,
    View: 0,
    MoveSpeed: 5,
    AttSpeed: 400,
    Regen: 1500,
    Attri: 10,
    ItemR: 0,
    MoneyR: 200,
    MaxI: 10,
    ResWind: 0,
    ResPois: 0,
    ResIce: 0,
    ResWater: 0,
    ResFire: 0,
  },
});
