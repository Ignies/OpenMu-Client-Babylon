import { defineMonster } from '@/controllers/monsters';
import { MonsterActionType } from '../../objects/enum';

export default defineMonster({
  Numb: 251,
  Name: 'Hanzo, Blacksmith',
  // MODEL_SMITH: on the idle clip's frames 5-6, four sparks off the anvil at bone 17,
  // `Angle (150-210, 0, 0-30)`, each with a chip (ZzzCharacter.cpp:6096-6109).
  bodyFx: [
    {
      kind: 'sparks',
      every: 1,
      tries: 4,
      bone: 17,
      pitch: [150, 210],
      yaw: [0, 30],
      chip: 1,
      gate: { action: [MonsterActionType.Stop1], frames: [[5, 6.001]] },
    },
  ],
  // The forge (MODEL_SMITH): (L, 0.4L, 0), range 3 (ZzzCharacter.cpp:5970-5971).
  light: { kind: 'forge', color: [1, 0.4, 0], range: 3 },
  maxHealth: 1000,
  // model.ts draws it at scale 1; this row is what the tables list.
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
