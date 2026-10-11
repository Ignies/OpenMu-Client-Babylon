import type { MapSound } from '@/controllers/sound';

/**
 * Icarus' sound (`MapLayer.sound`), read by the sound controller. The
 * original's boids here are dragons, none with a voice.
 */
export const ICARUS_SOUND: MapSound = {
  beds: [{ sound: 'Sound/aHeaven', volume: 0.4 }],
  music: 'Music/icarus',
};
