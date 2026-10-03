import { defineMonster } from '@/controllers/monsters';
import { walkSand } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 60,
  Name: 'Bloody Wolf',
  // MODEL_BLOODY_WOLF: sand walking (ZzzCharacter.cpp:5954-5957).
  bodyFx: [walkSand],
  maxHealth: 13500,
  model: { type: 43, scale: 2.2 },
  stats: {
    Rate: 1,
    Level: 76,
    HP: 13500,
    MP: 0,
    MinDmg: 260,
    MaxDmg: 300,
    Def: 200,
    MagDef: 0,
    AttackSuccess: 410,
    Move: 130,
    AttType: 3,
    Range: 0,
    View: 2,
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
