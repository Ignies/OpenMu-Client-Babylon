import { defineMonster } from '@/controllers/monsters';
import { DREADFEAR_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 439,
  Name: 'Dreadfear',
  maxHealth: 94000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: DREADFEAR_BLURS,
  model: { type: 116, scale: 1.3 },
  stats: {
    Rate: 1,
    Level: 119,
    HP: 55000,
    MP: 0,
    MinDmg: 550,
    MaxDmg: 580,
    Def: 600,
    MagDef: 0,
    AttackSuccess: 1015,
    Move: 905,
    AttType: 3,
    Range: 0,
    View: 2,
    MoveSpeed: 5,
    AttSpeed: 500,
    Regen: 1500,
    Attri: 10,
    ItemR: 2,
    MoneyR: 130,
    MaxI: 0,
    ResWind: 3,
    ResPois: 0,
    ResIce: 27,
    ResWater: 27,
    ResFire: 27,
  },
});
