import type { MapSound } from '@/controllers/sound';

/**
 * Atlans' sound (`MapLayer.sound`), read by the sound controller. The
 * original's boids here are fish, none with a voice.
 */
export const ATLANS_SOUND: MapSound = {
  beds: [{ sound: 'Sound/aWater', volume: 0.4 }],
  music: 'Music/atlans',
};
