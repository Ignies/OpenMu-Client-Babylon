import { defineMonster } from '@/controllers/monsters';
import { haze } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 27,
  Name: 'Scorpion',
  // MODEL_CHAIN_SCORPION: the haze, in the tail lamp's `(L, 0.4L, 0.2L)`, `L` 0.2-0.9 at its mean (ZzzCharacter.cpp:6149-6166).
  bodyFx: [haze([0.55, 0.22, 0.11])],
  // Ours: the floor under the tail lamp, at its `(L, 0.4L, 0.2L)` and the frame's `L` roll (ZzzCharacter.cpp:5698, :6149-6155).
  light: { kind: 'flicker', range: 2, height: 0.25, color: [1, 0.4, 0.2] },
  maxHealth: 80,
  model: { type: 20, scale: 1.1 },
  stats: {
    Rate: 1,
    Level: 5,
    HP: 80,
    MP: 0,
    MinDmg: 13,
    MaxDmg: 17,
    Def: 4,
    MagDef: 0,
    AttackSuccess: 23,
    Move: 4,
    AttType: 3,
    Range: 0,
    View: 1,
    MoveSpeed: 4,
    AttSpeed: 400,
    Regen: 1800,
    Attri: 10,
    ItemR: 2,
    MoneyR: 120,
    MaxI: 10,
    ResWind: 6,
    ResPois: 0,
    ResIce: 0,
    ResWater: 0,
    ResFire: 0,
  },
});
