import { defineMonster } from '@/controllers/monsters';
import { bone } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 59,
  Name: 'Zaikan',
  // `SubType 1` (ZzzCharacter.cpp:13752): `BITMAP_FIRE` on bones 6 and 13 every tick (:5961-5972).
  bodyFx: [bone(1, 'firePuff', 6), bone(1, 'firePuff', 13)],
  // The fire around it takes light off the floor: AddTerrainLight(-1.3, range 3) (SubType 1, ZzzCharacter.cpp:5968-5969).
  light: { kind: 'dark' },
  maxHealth: 34000,
  model: { type: 42, scale: 2.1 },
  stats: {
    Rate: 1,
    Level: 90,
    HP: 34000,
    MP: 0,
    MinDmg: 510,
    MaxDmg: 690,
    Def: 400,
    MagDef: 0,
    AttackSuccess: 550,
    Move: 185,
    AttType: 3,
    Range: 150,
    View: 5,
    MoveSpeed: 7,
    AttSpeed: 400,
    Regen: 1400,
    Attri: 150,
    ItemR: 2,
    MoneyR: 160,
    MaxI: 30,
    ResWind: 3,
    ResPois: 0,
    ResIce: 13,
    ResWater: 13,
    ResFire: 13,
  },
});
