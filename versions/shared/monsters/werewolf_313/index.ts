import { defineMonster } from '@/controllers/monsters';
import { WEREWOLF_HERO_BLURS, crywolfWalkSmoke, werewolfHeroHead } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 313,
  Name: 'Werewolf',
  maxHealth: 110000,
  // Its Crywolf visuals (`_shared/bodyFx.ts`, GMCrywolf1st.cpp).
  bodyFx: [...WEREWOLF_HERO_BLURS, werewolfHeroHead(), crywolfWalkSmoke([1, 1, 1])],
  model: { type: 95, scale: 1.25 },
  stats: {
    Rate: 1,
    Level: 118,
    HP: 30000,
    MP: 0,
    MinDmg: 400,
    MaxDmg: 440,
    Def: 400,
    MagDef: 0,
    AttackSuccess: 840,
    Move: 240,
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
