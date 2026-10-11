import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 222,
  Name: 'Slingshot Defend',
  // Created with `m_bRenderShadow = false` (GMBattleCastle.cpp:1367).
  classicShadow: false,
  maxHealth: 50,
  // Castle Siege (GMBattleCastle.cpp:1286-1381).
  npcModel: { file: 'Model_Npc_Catapult_Def', scale: 0.8 },
  stats: {
    Rate: 1,
    Level: 2,
    HP: 50,
    MP: 0,
    MinDmg: 15,
    MaxDmg: 30,
    Def: 70,
    MagDef: 20,
    AttackSuccess: 10,
    Move: 30,
    AttType: 0,
    Range: 0,
    View: 0,
    MoveSpeed: 0,
    AttSpeed: 400,
    Regen: 1500,
    Attri: 0,
    ItemR: 0,
    MoneyR: 0,
    MaxI: 0,
    ResWind: 0,
    ResPois: 0,
    ResIce: 0,
    ResWater: 0,
    ResFire: 0,
  },
});
