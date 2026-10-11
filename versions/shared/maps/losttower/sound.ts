import type { MapSound } from '@/controllers/sound';

/** Lost Tower's sound (`MapLayer.sound`), read by the sound controller. */
export const LOST_TOWER_SOUND: MapSound = {
  beds: [{ sound: 'Sound/aTower', volume: 0.4 }],
  music: 'Music/lost_tower_a',
};
