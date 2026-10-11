import { defineMonster } from '@/controllers/monsters';
import { haze } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 10,
  Name: 'Dark Knight',
  // MODEL_DARK_KNIGHT: the haze (ZzzCharacter.cpp:6147).
  bodyFx: [haze()],
  maxHealth: 3000,
  model: { type: 3, scale: 0.8 },
  stats: {
    Rate: 1,
    Level: 48,
    HP: 3000,
    MP: 0,
    MinDmg: 150,
    MaxDmg: 155,
    Def: 80,
    MagDef: 0,
    AttackSuccess: 240,
    Move: 70,
    AttType: 3,
    Range: 0,
    View: 1,
    MoveSpeed: 5,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 10,
    ItemR: 2,
    MoneyR: 200,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 3,
    ResWater: 3,
    ResFire: 3,
  },
});
