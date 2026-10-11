import { defineMonster } from '@/controllers/monsters';
import { walkSand } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 62,
  Name: 'Mutant',
  // MODEL_MUTANT: sand walking (ZzzCharacter.cpp:5834-5838).
  bodyFx: [walkSand],
  maxHealth: 10000,
  model: { type: 45, scale: 1.5 },
  stats: {
    Rate: 1,
    Level: 72,
    HP: 10000,
    MP: 0,
    MinDmg: 250,
    MaxDmg: 280,
    Def: 190,
    MagDef: 0,
    AttackSuccess: 365,
    Move: 120,
    AttType: 3,
    Range: 0,
    View: 1,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 10,
    ItemR: 2,
    MoneyR: 170,
    MaxI: 30,
    ResWind: 3,
    ResPois: 0,
    ResIce: 8,
    ResWater: 8,
    ResFire: 8,
  },
});
