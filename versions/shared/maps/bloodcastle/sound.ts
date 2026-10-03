import type { MapSound } from '@/controllers/sound';

/** Blood Castle's sound (`MapLayer.sound`), read by the sound controller. */
export const BLOOD_CASTLE_SOUND: MapSound = {
  // `iBloodCastle` starts looping on state 0 (`SetMatchGameCommand`,
  // NewBloodCastleSystem.cpp:42) and is the only sound the castle has.
  beds: [{ sound: 'Sound/iBloodCastle', volume: 0.4, when: 'bloodCastleRunning' }],
  // No `ManageBackgroundMusic` case: the soundscape is the event loop above.
  music: null,
};
