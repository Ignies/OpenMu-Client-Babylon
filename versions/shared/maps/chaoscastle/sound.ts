import type { MapSound } from '@/controllers/sound';

/** Chaos Castle's sound (`MapLayer.sound`), read by the sound controller. */
export const CHAOS_CASTLE_SOUND: MapSound = {
  // `aChaos` (SOUND_CHAOS_ENVIR) while the arena waits, swapped for the
  // `iChaosCastle` loop on state 5 and back on state 7
  // (NewChaosCastleSystem.cpp:66-82).
  beds: [
    { sound: 'Sound/aChaos', volume: 0.4, when: 'chaosCastleWaiting' },
    { sound: 'Sound/iChaosCastle', volume: 0.4, when: 'chaosCastleRunning' },
  ],
  // No `ManageBackgroundMusic` case: the soundscape is the event loop above.
  music: null,
};
