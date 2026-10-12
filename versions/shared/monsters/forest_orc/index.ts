import { defineMonster } from '@/controllers/monsters';
import { ORC_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 307,
  Name: 'Forest Orc',
  maxHealth: 11000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: ORC_BLURS,
  model: { type: 103, scale: 1.15 },
  stats: {
    Rate: 1,
    Level: 64,
    HP: 6500,
    MP: 0,
    MinDmg: 230,
    MaxDmg: 250,
    Def: 150,
    MagDef: 0,
    AttackSuccess: 1800,
    Move: 95,
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
