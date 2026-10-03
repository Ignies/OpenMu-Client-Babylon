import { defineMonster } from '@/controllers/monsters';
import { APPEAR_TICKS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 53,
  Name: 'Golden Titan',
  // `c->Appear = 60` on arrival (WSclient.cpp:2856, ZzzCharacter.cpp:5639-5652).
  bodyFx: [{ kind: 'appear', ticks: APPEAR_TICKS }],
  maxHealth: 6500,
  model: { type: 39, scale: 1.8 },
  stats: {
    Rate: 1,
    Level: 53,
    HP: 6500,
    MP: 0,
    MinDmg: 170,
    MaxDmg: 180,
    Def: 105,
    MagDef: 0,
    AttackSuccess: 265,
    Move: 77,
    AttType: 3,
    Range: 150,
    View: 3,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 2000,
    Attri: 20,
    ItemR: 2,
    MoneyR: 200,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 5,
    ResWater: 5,
    ResFire: 5,
  },
});
