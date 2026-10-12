import { defineMonster } from '@/controllers/monsters';
import { crywolfWalkSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 436,
  Name: 'Balram (Trainee)',
  maxHealth: 90000,
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: [crywolfWalkSmoke([0.9, 0.2, 0.1])],
  model: { type: 91, scale: 1.25 },
  // The old table's converter read this row one column off, the level inside the name (readme.md).
  stats: {
    Rate: 1,
    Level: 134,
    HP: 55000,
    MP: 0,
    MinDmg: 570,
    MaxDmg: 620,
    Def: 530,
    MagDef: 0,
    AttackSuccess: 1500,
    Move: 370,
    AttType: 6,
    Range: 0,
    View: 7,
    MoveSpeed: 7,
    AttSpeed: 700,
    Regen: 1700,
    Attri: 10,
    ItemR: 2,
    MoneyR: 150,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 23,
    ResWater: 23,
    ResFire: 23,
  },
});
