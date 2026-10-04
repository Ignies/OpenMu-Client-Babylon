import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MapSound, VoiceSet } from '@/controllers/sound';
import {
  ATTACK_1_2,
  HOOK,
  WALK_RUN,
  hookOnce,
  hookPlay,
  hookWalk,
} from '../shared/sound';

const A = MonsterActionType;

const NOT_DYING: readonly MonsterActionType[] = [
  A.Stop1, A.Stop2, A.Walk, A.Run, A.Attack1, A.Attack2, A.Attack3, A.Attack4, A.Shock, A.Appear,
];

/**
 * `M31HuntingGround::RenderHuntingGroundMonsterVisual` (GMHuntingGround.cpp:371-719),
 * no world guard, and the Erohim's entrance in `CreateHuntingGroundMonster` (:285).
 */
const LAND_OF_TRIALS: VoiceSet = {
  // LIZARD_WARRIOR
  81: [
    hookWalk(['Sound/w31/mLWidle1', 'Sound/w31/mLWidle2']),
    hookOnce(ATTACK_1_2, ['Sound/w31/mLWattack1', 'Sound/w31/mLWattack2']),
    hookOnce([A.Die], 'Sound/w31/mLWdeath'),
  ],
  // FIRE_GOLEM - rumbles in every clip but its death
  82: [
    { on: NOT_DYING, play: ['Sound/w31/mFGidle1', 'Sound/w31/mFGidle2'], chance: 20, perFrame: true, ...HOOK },
    { on: [A.Attack1], play: 'Sound/w31/mFGattack1', frame: [8.4, 10.2], once: true, ...HOOK },
    { on: [A.Attack2], play: 'Sound/w31/mFGattack2', frame: [5, 5.7], once: true, ...HOOK },
    hookPlay([A.Die], 'Sound/w31/mFGdeath'),
  ],
  // QUEEN_BEE - its walk line takes the latch too; dies with the Axe Warrior's line
  83: [
    hookOnce(WALK_RUN, ['Sound/w31/mQBidle1', 'Sound/w31/mQBidle2']),
    hookOnce(ATTACK_1_2, ['Sound/w31/mQBattack1', 'Sound/w31/mQBattack2']),
    hookOnce([A.Die], 'Sound/w31/mAWdeath'),
  ],
  // POISON_GOLEM
  84: [
    hookOnce(WALK_RUN, ['Sound/w31/mPGidle1', 'Sound/w31/mPGidle2']),
    hookOnce([A.Attack1], 'Sound/w31/mPGeff1'),
    {
      on: [A.Attack2],
      play: ['Sound/w31/mPGattack1', 'Sound/w31/mPGattack2'],
      frame: [3.5, 4.2],
      once: true,
      ...HOOK,
    },
    hookPlay([A.Die], 'Sound/w31/mPGdeath'),
  ],
  // AXE_HERO
  85: [
    hookWalk(['Sound/w31/mAWidle1', 'Sound/w31/mAWidle2'], 10),
    hookOnce(ATTACK_1_2, ['Sound/w31/mAWattack1', 'Sound/w31/mAWattack2']),
    hookOnce([A.Die], 'Sound/w31/mAWdeath'),
  ],
  // EROHIM
  87: [
    { on: [], play: 'Sound/w31/mELOidle1', spawn: true, unranged: true, channels: 1 },
    hookOnce([A.Attack1], ['Sound/w31/mELOattack1', 'Sound/w31/mELOattack2']),
    hookOnce([A.Attack2], 'Sound/w31/mELOeff1'),
    hookOnce([A.Die], 'Sound/w31/mELOdeath'),
  ],
};

/** Land of Trials' sound (`MapLayer.sound`), read by the sound controller. */
export const LAND_OF_TRIALS_SOUND: MapSound = {
  // `aW31` once, never looped, whenever 300 s have passed on a global stamp
  // that starts at 0 - so on arrival, and not again on a return inside the
  // five minutes (GMHuntingGround.cpp:112-116).
  timed: [{ sound: 'Sound/w31/aW31', volume: 0.4, every: 300 }],
  music: 'Music/huntingground',
  monsterCuesAnyMap: LAND_OF_TRIALS,
};
