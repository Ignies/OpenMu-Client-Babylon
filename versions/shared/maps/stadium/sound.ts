import type { MapSound } from '@/controllers/sound';

/** The Stadium's sound (`MapLayer.sound`), read by the sound controller. */
export const STADIUM_SOUND: MapSound = {
  // No case in `ManageBackgroundMusic` and no ambient bed either: the arena
  // is deliberately silent in the original.
  music: null,
};
