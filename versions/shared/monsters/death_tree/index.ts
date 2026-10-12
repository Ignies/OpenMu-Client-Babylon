import { defineMonster } from '@/controllers/monsters';
import { DEATH_TREE_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 308,
  Name: 'Death Tree',
  maxHealth: 10000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: DEATH_TREE_BLURS,
  model: { type: 104, scale: 1.2 },
  stats: {
    Rate: 1,
    Level: 62,
    HP: 6000,
    MP: 0,
    MinDmg: 220,
    MaxDmg: 245,
    Def: 145,
    MagDef: 0,
    AttackSuccess: 1400,
    Move: 90,
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
