import { defineMonster } from '@/controllers/monsters';
import { bones } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 35,
  Name: 'Death Gorgon',
  // MODEL_GORGON, `c->Level == 2`: ten `BITMAP_FIRE` on random bones every tick (ZzzCharacter.cpp:6060-6072).
  bodyFx: [bones(1, 10, 'firePuff')],
  // The one classic monster that lights the floor itself (MODEL_GORGON, Level 2): (0.8, 0.16, 0), range 2 (ZzzCharacter.cpp:5956-5957).
  light: { kind: 'forge', color: [0.8, 0.16, 0], range: 2 },
  maxHealth: 6000,
  model: { type: 11, scale: 1.3 },
  stats: {
    Rate: 1,
    Level: 64,
    HP: 6000,
    MP: 0,
    MinDmg: 200,
    MaxDmg: 210,
    Def: 130,
    MagDef: 0,
    AttackSuccess: 320,
    Move: 94,
    AttType: 3,
    Range: 150,
    View: 1,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 2000,
    Attri: 10,
    ItemR: 2,
    MoneyR: 180,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 6,
    ResWater: 6,
    ResFire: 6,
  },
});
