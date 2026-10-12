import { defineMonster } from '@/controllers/monsters';
import { VALAM_CARDS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 316,
  Name: 'Valam',
  maxHealth: 140000,
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: VALAM_CARDS,
  model: { type: 96, scale: 1.2 },
  stats: {
    Rate: 1,
    Level: 123,
    HP: 35000,
    MP: 0,
    MinDmg: 450,
    MaxDmg: 490,
    Def: 430,
    MagDef: 0,
    AttackSuccess: 860,
    Move: 260,
    AttType: 3,
    Range: 150,
    View: 2,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 70,
    ItemR: 2,
    MoneyR: 180,
    MaxI: 30,
    ResWind: 3,
    ResPois: 0,
    ResIce: 9,
    ResWater: 7,
    ResFire: 9,
  },
});
