import { defineMonster } from '@/controllers/monsters';
import { SOLAM_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 317,
  Name: 'Solam',
  maxHealth: 164000,
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: SOLAM_BLURS,
  model: { type: 97, scale: 1.2 },
  stats: {
    Rate: 1,
    Level: 127,
    HP: 40000,
    MP: 0,
    MinDmg: 450,
    MaxDmg: 490,
    Def: 450,
    MagDef: 0,
    AttackSuccess: 880,
    Move: 280,
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
