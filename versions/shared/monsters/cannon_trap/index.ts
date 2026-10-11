import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 105,
  Name: 'Cannon Trap',
  maxHealth: 1000,
  // Kanturu Relics canon trap (`CTrapCanon::Create_TrapCanon`, GM_Kanturu_2nd.cpp:1380-1391).
  // Its render adds a sine-driven glow over the body (:1397-1404); only the body is here.
  npcModel: { file: 'c_mon', scale: 1 },
  stats: {
    Rate: 1,
    Level: 80,
    HP: 1000,
    MP: 0,
    MinDmg: 200,
    MaxDmg: 203,
    Def: 0,
    MagDef: 0,
    AttackSuccess: 400,
    Move: 500,
    AttType: 0,
    Range: 0,
    View: 4,
    MoveSpeed: 2,
    AttSpeed: 500,
    Regen: 1000,
    Attri: 3,
    ItemR: 1,
    MoneyR: 200,
    MaxI: 10,
    ResWind: 0,
    ResPois: 0,
    ResIce: 0,
    ResWater: 0,
    ResFire: 0,
  },
});
