import { defineMonster } from '@/controllers/monsters';
import { walkSand } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 300,
  Name: 'Hero Mutant',
  // MODEL_MUTANT: sand walking (ZzzCharacter.cpp:5834-5838).
  bodyFx: [walkSand],
  maxHealth: 20000,
  model: { type: 45, scale: 1.5 },
  stats: {
    Rate: 1,
    Level: 82,
    HP: 20000,
    MP: 0,
    MinDmg: 500,
    MaxDmg: 560,
    Def: 380,
    MagDef: 0,
    AttackSuccess: 415,
    Move: 170,
    AttType: 20,
    Range: 0,
    View: 1,
    MoveSpeed: 10,
    AttSpeed: 800,
    Regen: 1600,
    Attri: 10,
    ItemR: 2,
    MoneyR: 150,
    MaxI: 10,
    ResWind: 3,
    ResPois: 0,
    ResIce: 16,
    ResWater: 16,
    ResFire: 16,
  },
});
