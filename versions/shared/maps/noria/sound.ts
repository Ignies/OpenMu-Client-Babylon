import type { MapSound } from '@/controllers/sound';
import { WIND } from '../shared/sound';

/** Noria's sound (`MapLayer.sound`), read by the sound controller. */
export const NORIA_SOUND: MapSound = {
  // Wind with no gate at all, plus the forest one-shot below.
  beds: [WIND],
  // `if (rand_fps_check(512)) PlayBuffer(SOUND_FOREST01);` - birdsong over
  // the wind, roughly every 20 s (SceneManager.cpp:592). Noria's own boids
  // are butterflies, which are silent.
  oneShots: [{ sound: 'Sound/aForest', oneIn: 512, volume: 0.45 }],
  music: 'Music/Noria',
  town: {
    tracks: ['Music/Noria'],
    at: () => 'Music/Noria',
  },
};
