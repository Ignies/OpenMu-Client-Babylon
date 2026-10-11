import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 152,
  Name: 'Magic stone of %s',
  maxHealth: 50,
  // Kalima gate: all seven share `MODEL_WARCRAFT` (Skill/HellGate) and show its key 10 for good: they spawn
  // on frame 10 and stop on frame 8 with key 10 still the prior key (ZzzCharacter.cpp:13333-13334, :3737-3740).
  npcModel: { file: '/Skill/HellGate', scale: 1, holdFrame: 10 },
  summonSound: { sound: 'Sound/eWallFall', channels: 1 }, // 0x1F, WSclient.cpp:3117-3122
  stats: {
    Rate: 1,
    Level: 10,
    HP: 50,
    MP: 0,
    MinDmg: 0,
    MaxDmg: 0,
    Def: 0,
    MagDef: 0,
    AttackSuccess: 0,
    Move: 0,
    AttType: 0,
    Range: 0,
    View: 0,
    MoveSpeed: 0,
    AttSpeed: 0,
    Regen: 0,
    Attri: 0,
    ItemR: 2,
    MoneyR: 0,
    MaxI: 0,
    ResWind: 0,
    ResPois: 0,
    ResIce: 0,
    ResWater: 0,
    ResFire: 0,
  },
});
