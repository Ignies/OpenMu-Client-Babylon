import { defineMonster } from '@/controllers/monsters';
import { haze } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 43,
  Name: 'Golden Budge Dragon',
  // MODEL_BUDGE_DRAGON: its case has no `break` (ZzzCharacter.cpp:6138) and falls into the Dark Knight haze.
  bodyFx: [haze()],
  maxHealth: 2500,
  model: { type: 2, scale: 0.7 },
  stats: {
    Rate: 1,
    Level: 15,
    HP: 2500,
    MP: 0,
    MinDmg: 120,
    MaxDmg: 125,
    Def: 45,
    MagDef: 0,
    AttackSuccess: 75,
    Move: 30,
    AttType: 3,
    Range: 0,
    View: 1,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 600,
    ItemR: 2,
    MoneyR: 10,
    MaxI: 10,
    ResWind: 0,
    ResPois: 0,
    ResIce: 2,
    ResWater: 2,
    ResFire: 2,
  },
});
