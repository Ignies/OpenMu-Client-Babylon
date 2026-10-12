import { defineMonster } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { blur } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 440,
  Name: 'Dark Elf',
  maxHealth: 1000000,
  // RenderObject's Attack1 / Attack2 trail along his weapon's LinkBone 33 (GMCrywolf1st.cpp:1254-1282; the default
  // link bone, ZzzCharacter.cpp:12069).
  bodyFx: [blur(33, 33, [1, 1, 1], 'blur02', { fromLocal: [0, 0, -60], toLocal: [0, 0, -150], gate: { action: [A.Attack1, A.Attack2] } })],
  model: { type: 92, scale: 1.5 },
  stats: {
    Rate: 1,
    Level: 135,
    HP: 65000,
    MP: 0,
    MinDmg: 600,
    MaxDmg: 730,
    Def: 650,
    MagDef: 0,
    AttackSuccess: 1500,
    Move: 370,
    AttType: 6,
    Range: 0,
    View: 6,
    MoveSpeed: 10,
    AttSpeed: 700,
    Regen: 1700,
    Attri: 10,
    ItemR: 2,
    MoneyR: 150,
    MaxI: 14,
    ResWind: 3,
    ResPois: 23,
    ResIce: 23,
    ResWater: 23,
    ResFire: 23,
  },
});
