import { defineMonster } from '@/controllers/monsters';
import { bone } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 40,
  Name: 'Death Knight',
  // MODEL_DEATH_KNIGHT: `BITMAP_FIRE` from bone 2, one tick in two (ZzzCharacter.cpp:6002-6010).
  bodyFx: [bone(2, 'firePuff', 2)],
  maxHealth: 5500,
  model: { type: 29, scale: 1.3 },
  stats: {
    Rate: 1,
    Level: 62,
    HP: 5500,
    MP: 0,
    MinDmg: 190,
    MaxDmg: 200,
    Def: 120,
    MagDef: 0,
    AttackSuccess: 310,
    Move: 91,
    AttType: 3,
    Range: 0,
    View: 1,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1800,
    Attri: 10,
    ItemR: 2,
    MoneyR: 200,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 6,
    ResWater: 6,
    ResFire: 6,
  },
});
