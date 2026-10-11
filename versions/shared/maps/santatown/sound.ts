import type { MapSound } from '@/controllers/sound';
import { SNOW_STEPS } from '../shared/sound';

/** Santa Town's sound (`MapLayer.sound`), read by the sound controller. */
export const SANTA_TOWN_SOUND: MapSound = {
  footsteps: SNOW_STEPS,
  music: 'Music/Santa_Village',
};
