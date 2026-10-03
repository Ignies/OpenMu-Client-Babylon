import { defineMonster } from '@/controllers/monsters';
import { bone, dieSand, walkSand } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 61,
  Name: 'Vim Knight',
  // MODEL_BEAM_KNIGHT: two small flames, bones 62 and 77, Scale 0.2, breathing `(L, 0.5L, 0.5L)`
  // (`L = sin(t*0.002)*0.3+0.7` at its mean); the sand walking and dying (ZzzCharacter.cpp:5924-5952).
  bodyFx: [
    bone(1, 'flameLick', 62, { scale: 0.2, colour: [0.7, 0.35, 0.35] }),
    bone(1, 'flameLick', 77, { scale: 0.2, colour: [0.7, 0.35, 0.35] }),
    walkSand,
    dieSand,
  ],
  // Its Energy Ball (17) ends with no SOUND_MAGIC (ZzzCharacter.cpp:5087-5122).
  quietCasts: [17],
  maxHealth: 25000,
  model: { type: 44, scale: 1.5 },
  stats: {
    Rate: 1,
    Level: 84,
    HP: 25000,
    MP: 0,
    MinDmg: 375,
    MaxDmg: 425,
    Def: 275,
    MagDef: 0,
    AttackSuccess: 530,
    Move: 190,
    AttType: 3,
    Range: 17,
    View: 4,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 20,
    ItemR: 2,
    MoneyR: 160,
    MaxI: 30,
    ResWind: 3,
    ResPois: 0,
    ResIce: 10,
    ResWater: 10,
    ResFire: 10,
  },
});
