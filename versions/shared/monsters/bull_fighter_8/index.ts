import { defineMonster } from '@/controllers/monsters';
import { BULL_SNORT } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 8,
  Name: 'Bull Fighter',
  // MODEL_BULL_FIGHTER's snort (ZzzCharacter.cpp:6189-6205).
  bodyFx: BULL_SNORT,
  maxHealth: 2500,
  model: { type: 0, scale: 1 },
  stats: {
    Rate: 1,
    Level: 46,
    HP: 2500,
    MP: 0,
    MinDmg: 145,
    MaxDmg: 150,
    Def: 75,
    MagDef: 0,
    AttackSuccess: 230,
    Move: 61,
    AttType: 3,
    Range: 1,
    View: 1,
    MoveSpeed: 5,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 10,
    ItemR: 2,
    MoneyR: 190,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 6,
    ResWater: 2,
    ResFire: 2,
  },
});
