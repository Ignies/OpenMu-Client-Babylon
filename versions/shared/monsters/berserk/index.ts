import { defineMonster } from '@/controllers/monsters';
import { BERSERKER_BLURS } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 435,
  Name: 'Berserk',
  maxHealth: 70000,
  // Its swing blurs, from the map file's blur effect (`_shared/bodyFx.ts`).
  bodyFx: BERSERKER_BLURS,
  model: { type: 106, scale: 0.95 },
  stats: {
    Rate: 1,
    Level: 100,
    HP: 45000,
    MP: 0,
    MinDmg: 480,
    MaxDmg: 530,
    Def: 400,
    MagDef: 0,
    AttackSuccess: 1000,
    Move: 360,
    AttType: 3,
    Range: 0,
    View: 2,
    MoveSpeed: 7,
    AttSpeed: 800,
    Regen: 1700,
    Attri: 10,
    ItemR: 2,
    MoneyR: 110,
    MaxI: 0,
    ResWind: 4,
    ResPois: 0,
    ResIce: 50,
    ResWater: 50,
    ResFire: 50,
  },
});
