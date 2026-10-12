import { defineMonster } from '@/controllers/monsters';
import { WEREWOLF_HERO_BLURS, crywolfWalkSmoke, werewolfHeroHead } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 315,
  Name: 'Werewolf(Hero)',
  maxHealth: 123000,
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: [...WEREWOLF_HERO_BLURS, werewolfHeroHead(), crywolfWalkSmoke([1, 1, 1])],
  model: { type: 95, scale: 1.25 },
  stats: {
    Rate: 1,
    Level: 127,
    HP: 50000,
    MP: 0,
    MinDmg: 500,
    MaxDmg: 540,
    Def: 520,
    MagDef: 0,
    AttackSuccess: 900,
    Move: 320,
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
