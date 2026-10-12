import { defineMonster } from '@/controllers/monsters';
import { GIGANTIS_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 434,
  Name: 'Gigantis',
  maxHealth: 43000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: GIGANTIS_BLURS,
  model: { type: 112, scale: 1.2 },
  // The old table's converter read this row one column off, the level inside the name (readme.md).
  stats: {
    Rate: 1,
    Level: 98,
    HP: 40000,
    MP: 0,
    MinDmg: 460,
    MaxDmg: 500,
    Def: 400,
    MagDef: 0,
    AttackSuccess: 715,
    Move: 250,
    AttType: 3,
    Range: 0,
    View: 2,
    MoveSpeed: 7,
    AttSpeed: 500,
    Regen: 1500,
    Attri: 10,
    ItemR: 2,
    MoneyR: 135,
    MaxI: 0,
    ResWind: 3,
    ResPois: 0,
    ResIce: 25,
    ResWater: 25,
    ResFire: 25,
  },
});
