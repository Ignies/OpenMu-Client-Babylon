import { CharacterClassNumber, PlayerClass } from '@/core/types';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 375,
  Name: 'Chaos Card Master',
  maxHealth: 350000,
  // Chaos Card Master (ZzzCharacter.cpp:14347-14367): Venom Mist +9, wings and no weapon.
  gear: {
    charClass: CharacterClassNumber.Summoner,
    playerClass: PlayerClass.Summoner,
    set: 30, // Venom Mist
    level: 9,
    wings: { group: 12, num: 1 }, // MODEL_WINGS_OF_HEAVEN
  },
  stats: {
    Rate: 1,
    Level: 140,
    HP: 350000,
    MP: 0,
    MinDmg: 1350,
    MaxDmg: 1600,
    Def: 1100,
    MagDef: 0,
    AttackSuccess: 1250,
    Move: 600,
    AttType: 3,
    Range: 150,
    View: 2,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 7200,
    ItemR: 2,
    MoneyR: 160,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 1500,
    ResWater: 1500,
    ResFire: 1500,
  },
});
