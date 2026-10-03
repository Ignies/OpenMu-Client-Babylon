import type { MapSound } from '@/controllers/sound';
import { CRYWOLF } from '../crywolf/sound';

/** Devil Square's sound (`MapLayer.sound`), read by the sound controller. */
export const DEVIL_SQUARE_SOUND: MapSound = {
  // `PlayWorldAmbientSounds` has no case for it, but the rain loop is the one
  // bed `StopInactiveAmbientSounds` never stops here (SceneManager.cpp:658:
  // `WorldActive != WD_0LORENCIA && InDevilSquare() == false`), so whatever
  // rain was playing keeps playing - and `MoveLeaves` gives the square the
  // full `MAX_LEAVES` rain budget (ZzzEffectFireLeave.cpp:422).
  beds: [{ sound: 'Sound/aRain', volume: 0.4 }],
  // No `ManageBackgroundMusic` case: the soundscape is the rain loop above.
  music: null,
  // `IsCyrWolf1st() || InDevilSquare()` (GMCrywolf1st.cpp:1568).
  monsterCues: CRYWOLF,
};
