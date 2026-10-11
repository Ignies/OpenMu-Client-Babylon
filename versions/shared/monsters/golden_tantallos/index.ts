import { defineMonster } from '@/controllers/monsters';
import { dieSand, walkSand } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 82,
  Name: 'Golden Tantallos',
  // MODEL_TANTALLOS `SubType 0`: sand walking and dying (ZzzCharacter.cpp:5975-5978).
  bodyFx: [walkSand, dieSand],
  maxHealth: 32000,
  model: { type: 42, scale: 1.8 },
  stats: {
    Rate: 1,
    Level: 90,
    HP: 32000,
    MP: 0,
    MinDmg: 450,
    MaxDmg: 560,
    Def: 300,
    MagDef: 0,
    AttackSuccess: 450,
    Move: 185,
    AttType: 3,
    Range: 150,
    View: 2,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 70,
    ItemR: 2,
    MoneyR: 180,
    MaxI: 30,
    ResWind: 3,
    ResPois: 0,
    ResIce: 9,
    ResWater: 7,
    ResFire: 9,
  },
});
