import { defineMonster } from '@/controllers/monsters';
import { dieSand, walkSand } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 57,
  Name: 'Iron Wheel',
  // MODEL_GOLDEN_WHEEL: sand walking and dying (ZzzCharacter.cpp:5980-5984).
  bodyFx: [walkSand, dieSand],
  maxHealth: 17000,
  model: { type: 41, scale: 1.4 },
  stats: {
    Rate: 1,
    Level: 80,
    HP: 17000,
    MP: 0,
    MinDmg: 280,
    MaxDmg: 330,
    Def: 215,
    MagDef: 0,
    AttackSuccess: 446,
    Move: 150,
    AttType: 3,
    Range: 0,
    View: 4,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 10,
    ItemR: 2,
    MoneyR: 160,
    MaxI: 30,
    ResWind: 3,
    ResPois: 0,
    ResIce: 9,
    ResWater: 9,
    ResFire: 9,
  },
});
