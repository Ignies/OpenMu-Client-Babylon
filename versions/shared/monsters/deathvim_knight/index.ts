import { defineMonster } from '@/controllers/monsters';
import { DEATH_BEAM_KNIGHT_WINGS } from './bodyFx';

export default defineMonster({
  Numb: 63,
  Name: 'Deathvim Knight',
  // MONSTER_DEATH_BEAM_KNIGHT: the burning wings (ZzzCharacter.cpp:5843-5922).
  bodyFx: DEATH_BEAM_KNIGHT_WINGS,
  // The fire around it takes light off the floor: AddTerrainLight(-1.3, range 3) (ZzzCharacter.cpp:5910-5911).
  light: { kind: 'dark' },
  maxHealth: 40000,
  model: { type: 44, scale: 1.9 },
  stats: {
    Rate: 1,
    Level: 93,
    HP: 40000,
    MP: 0,
    MinDmg: 590,
    MaxDmg: 750,
    Def: 420,
    MagDef: 0,
    AttackSuccess: 575,
    Move: 220,
    AttType: 3,
    Range: 150,
    View: 5,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 150,
    ItemR: 2,
    MoneyR: 130,
    MaxI: 30,
    ResWind: 3,
    ResPois: 0,
    ResIce: 13,
    ResWater: 13,
    ResFire: 13,
  },
});
