import { defineMonster } from '@/controllers/monsters';
import { DEATH_RIDER_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 306,
  Name: 'Death Rider',
  maxHealth: 14000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: DEATH_RIDER_BLURS,
  model: { type: 102, scale: 1.1 },
  stats: {
    Rate: 1,
    Level: 68,
    HP: 8000,
    MP: 0,
    MinDmg: 232,
    MaxDmg: 262,
    Def: 170,
    MagDef: 0,
    AttackSuccess: 1600,
    Move: 110,
    AttType: 3,
    Range: 150,
    View: 2,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 30,
    ItemR: 2,
    MoneyR: 160,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 9,
    ResWater: 7,
    ResFire: 9,
  },
});
