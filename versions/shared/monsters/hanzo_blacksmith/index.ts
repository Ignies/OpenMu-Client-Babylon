import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 251,
  Name: 'Hanzo, Blacksmith',
  maxHealth: 1000,
  // MODEL_SMITH at c->Object.Scale = 0.95 (ZzzCharacter.cpp:14517-14522).
  npcModel: { file: 'Smith01', scale: 0.95 },
  // MODEL_SMITH: every tick the idle clip sits in frames 5-10, so one clang per swing of the
  // hammer (ZzzCharacter.cpp:6090-6092). The sparks are controllers/fx/monsterVisuals.ts.
  voice: { sound: 'Sound/nBlackSmith', frames: [5, 10] },
  stats: {
    Rate: 1,
    Level: 20,
    HP: 1000,
    MP: 0,
    MinDmg: 15,
    MaxDmg: 30,
    Def: 70,
    MagDef: 20,
    AttackSuccess: 100,
    Move: 30,
    AttType: 0,
    Range: 0,
    View: 0,
    MoveSpeed: 5,
    AttSpeed: 400,
    Regen: 1500,
    Attri: 10,
    ItemR: 0,
    MoneyR: 200,
    MaxI: 10,
    ResWind: 0,
    ResPois: 0,
    ResIce: 0,
    ResWater: 0,
    ResFire: 0,
  },
});
