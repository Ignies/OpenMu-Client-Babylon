import { defineMonster } from '@/controllers/monsters';
import { MonsterActionType } from '../../objects/enum';

export default defineMonster({
  Numb: 231,
  Name: 'Thomson Cannel',
  // MODEL_DEVIAS_TRADER: while idle, four tries a tick at bone 37 + (0, 5, 10) cm,
  // `Angle (90-150, 0, 0-30)`, a chip one time in two (ZzzCharacter.cpp:6111-6127).
  bodyFx: [
    {
      kind: 'sparks',
      every: 1,
      tries: 4,
      bone: 37,
      local: [0, 5, 10],
      pitch: [90, 150],
      yaw: [0, 30],
      chip: 0.5,
      gate: { action: [MonsterActionType.Stop1] },
    },
  ],
  // The brazier (MODEL_DEVIAS_TRADER): (0.5L, 0.3L, 0), range 3 (ZzzCharacter.cpp:5999-6000).
  light: { kind: 'forge', color: [0.5, 0.3, 0], range: 3 },
  maxHealth: 50,
  npcModel: { file: 'DeviasTrader01' },
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
