import { defineMonster } from '@/controllers/monsters';
import { haze } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 2,
  Name: 'Budge Dragon',
  // MODEL_BUDGE_DRAGON: its case has no `break` (ZzzCharacter.cpp:6138) and falls into the Dark Knight haze.
  bodyFx: [haze()],
  maxHealth: 60,
  model: { type: 2, scale: 0.5 },
  stats: {
    Rate: 1,
    Level: 4,
    HP: 60,
    MP: 0,
    MinDmg: 10,
    MaxDmg: 13,
    Def: 3,
    MagDef: 0,
    AttackSuccess: 18,
    Move: 3,
    AttType: 3,
    Range: 0,
    View: 1,
    MoveSpeed: 4,
    AttSpeed: 400,
    Regen: 2000,
    Attri: 10,
    ItemR: 2,
    MoneyR: 120,
    MaxI: 10,
    ResWind: 6,
    ResPois: 0,
    ResIce: 0,
    ResWater: 0,
    ResFire: 0,
  },
});
