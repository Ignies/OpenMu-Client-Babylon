import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MapSound } from '@/controllers/sound';
import { HOOK } from '../shared/sound';
import { KALIMA_OBJECT_LOOPS } from './spec';

const A = MonsterActionType;

/** Kalima's sound (`MapLayer.sound`), read by the sound controller. */
export const KALIMA_SOUND: MapSound = {
  // Not in `PlayWorldAmbientSounds`: `MoveHellasObjectSetting`
  // `PlayBuffer`s the loop every frame (GMHellas.cpp:309), which is the same
  // thing as a bed.
  beds: [{ sound: 'Sound/aKalima', volume: 0.4 }],
  // GMHellas.cpp:311-315, :340-352: one of `aKalima01`/`02` every 4 s
  // (`AmbientSoundInterval`), i.e. one roll in 100 ticks split over two rows,
  // and the falling stone's `aKalimaStone` on `rand_fps_check(5) &&
  // rand_fps_check(15)` = one in 75.
  oneShots: [
    { sound: 'Sound/aKalima01', oneIn: 200, volume: 0.45 },
    { sound: 'Sound/aKalima02', oneIn: 200, volume: 0.45 },
    // Loaded on three channels (MapManager.cpp:995).
    {
      sound: 'Sound/aKalimaStone',
      oneIn: 75,
      volume: 0.4,
      spread: 4,
      channels: 3,
    },
  ],
  music: 'Music/kalima',
  // GMHellas.cpp:479, :487 (`RenderHellasVisual`) - every Kalima floor.
  objectLoops: KALIMA_OBJECT_LOOPS,
  monsterCuesAnyMap: {
    // ILLUSION_OF_KUNDUN - the real Kundun's collapse, `RenderHellasMonsterObjectMesh`
    // (GMHellas.cpp:2016, :2059). His roar (:1644) answers MONSTER01_SHOCK, which
    // Kundun 7 never plays (WSclient.cpp:3300). No world guard.
    64: [
      { on: [A.Die], play: 'Sound/mKundunDestory', frame: [8, Infinity], ...HOOK },
      // `> 14.8f` is the clip's last sliver, one key past where ours holds
      { on: [A.Die], play: 'Sound/mKundunShudder', frame: [14.8, Infinity], ...HOOK },
    ],
  },
};
