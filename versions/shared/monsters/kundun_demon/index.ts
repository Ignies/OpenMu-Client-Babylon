import { defineMonster } from '@/controllers/monsters';
import { KUNDUN_FX } from './bodyFx';

export default defineMonster({
  Numb: 275,
  Name: 'Kundun Demon',
  // MODEL_ILLUSION_OF_KUNDUN: see `bodyFx.ts`.
  bodyFx: KUNDUN_FX,
  maxHealth: 140000,
  model: { type: 64, scale: 2 },
  stats: {
    Rate: 1,
    Level: 148,
    HP: 450000,
    MP: 0,
    MinDmg: 1450,
    MaxDmg: 1700,
    Def: 1200,
    MagDef: 0,
    AttackSuccess: 1400,
    Move: 700,
    AttType: 3,
    Range: 150,
    View: 2,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 21600,
    ItemR: 2,
    MoneyR: 160,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 5000,
    ResWater: 5000,
    ResFire: 5000,
  },
});
