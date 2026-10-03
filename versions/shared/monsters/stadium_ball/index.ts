import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 200,
  Name: 'Stadium Ball',
  maxHealth: 1000,
  // Soccer ball (ZzzCharacter.cpp:14015-14021). Its `BlendMesh = 2` (the additive panel)
  // is not modelled.
  npcModel: { file: '/Skill/Ball01', scale: 1.8 },
  stats: {
    Rate: 1,
    Level: 12,
    HP: 1000,
    MP: 0,
    MinDmg: 150,
    MaxDmg: 200,
    Def: 0,
    MagDef: 0,
    AttackSuccess: 60,
    Move: 500,
    AttType: 0,
    Range: 0,
    View: 4,
    MoveSpeed: 1,
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
