import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 103,
  Name: 'Meteorite',
  // AttackEffect rains meteors and replays SOUND_METEORITE01 while it casts AT_SKILL_BOSS (ZzzCharacter.cpp:1993-1998).
  stormSkill: 50,
  maxHealth: 1000,
  // MONSTER_METEORITE_TRAP (ZzzCharacter.cpp:14282).
  trap: { object: 25, shadow: true },
  stats: {
    Rate: 1,
    Level: 90,
    HP: 1000,
    MP: 0,
    MinDmg: 160,
    MaxDmg: 190,
    Def: 0,
    MagDef: 0,
    AttackSuccess: 450,
    Move: 500,
    AttType: 0,
    Range: 50,
    View: 0,
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
