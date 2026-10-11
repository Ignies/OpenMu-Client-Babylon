import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 39,
  Name: 'Poison Shadow',
  // Ours: the Shadow body, but additive, in Vector(0.2, 0.7, 0.1) at Luminosity 1: steady
  // (ZzzCharacter.cpp:11308-11318).
  light: { kind: 'carried', range: 3, color: [0.2, 0.7, 0.1], steady: true },
  maxHealth: 3500,
  model: { type: 28, scale: 1.2 },
  stats: {
    Rate: 1,
    Level: 50,
    HP: 3500,
    MP: 0,
    MinDmg: 155,
    MaxDmg: 160,
    Def: 85,
    MagDef: 0,
    AttackSuccess: 250,
    Move: 73,
    AttType: 3,
    Range: 1,
    View: 1,
    MoveSpeed: 5,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 10,
    ItemR: 2,
    MoneyR: 200,
    MaxI: 14,
    ResWind: 3,
    ResPois: 0,
    ResIce: 6,
    ResWater: 4,
    ResFire: 4,
  },
});
