import { defineMonster } from '@/controllers/monsters';
import { bone } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 19,
  Name: 'Yeti',
  // MODEL_YETI: breath, `BITMAP_SMOKE` from bone 22, one tick in four (ZzzCharacter.cpp:6180).
  bodyFx: [bone(4, 'bodySmoke', 22)],
  maxHealth: 900,
  model: { type: 12, scale: 1.1 },
  stats: {
    Rate: 1,
    Level: 30,
    HP: 900,
    MP: 0,
    MinDmg: 105,
    MaxDmg: 110,
    Def: 37,
    MagDef: 0,
    AttackSuccess: 150,
    Move: 37,
    AttType: 2,
    Range: 17,
    View: 4,
    MoveSpeed: 6,
    AttSpeed: 400,
    Regen: 2000,
    Attri: 10,
    ItemR: 2,
    MoneyR: 180,
    MaxI: 14,
    ResWind: 6,
    ResPois: 0,
    ResIce: 0,
    ResWater: 3,
    ResFire: 0,
  },
});
