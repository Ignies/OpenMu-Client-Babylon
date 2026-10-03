import type { MapSound } from '@/controllers/sound';

/**
 * Tarkan's sound (`MapLayer.sound`), read by the sound controller. The
 * original's boids here are bugs, none with a voice.
 */
export const TARKAN_SOUND: MapSound = {
  beds: [{ sound: 'Sound/desert', volume: 0.4 }],
  music: 'Music/tarkan',
};
