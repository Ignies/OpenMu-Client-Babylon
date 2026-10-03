import { defineMonster } from '@/controllers/monsters';
import { bone } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 20,
  Name: 'Elite Yeti',
  // MODEL_ELITE_YETI: the same breath (ZzzCharacter.cpp:6181).
  bodyFx: [bone(4, 'bodySmoke', 22)],
  maxHealth: 1200,
  model: { type: 13, scale: 1.4 },
  stats: {
    Rate: 1,
    Level: 36,
    HP: 1200,
    MP: 0,
    MinDmg: 120,
    MaxDmg: 125,
    Def: 50,
    MagDef: 0,
    AttackSuccess: 180,
    Move: 43,
    AttType: 3,
    Range: 0,
    View: 1,
    MoveSpeed: 6,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 10,
    ItemR: 2,
    MoneyR: 180,
    MaxI: 14,
    ResWind: 6,
    ResPois: 0,
    ResIce: 1,
    ResWater: 4,
    ResFire: 1,
  },
});
