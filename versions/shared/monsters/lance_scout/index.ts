import { defineMonster } from '@/controllers/monsters';
import { SOLAM_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 311,
  Name: 'Lance Scout',
  maxHealth: 45000,
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: SOLAM_BLURS,
  model: { type: 97, scale: 1.2 },
  stats: {
    Rate: 1,
    Level: 97,
    HP: 25000,
    MP: 0,
    MinDmg: 340,
    MaxDmg: 380,
    Def: 320,
    MagDef: 0,
    AttackSuccess: 800,
    Move: 200,
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
