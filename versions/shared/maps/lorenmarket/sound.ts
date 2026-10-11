import type { MapSound } from '@/controllers/sound';
import { WIND } from '../shared/sound';

/** Loren Market's sound (`MapLayer.sound`), read by the sound controller. */
export const LOREN_MARKET_SOUND: MapSound = {
  // Wind and rain, both unconditional (SceneManager.cpp:623-628) and both
  // spared by `StopInactiveAmbientSounds` - it always rains here.
  beds: [WIND, { sound: 'Sound/aRain', volume: 0.4 }],
  // `GMUnitedMarketPlace::PlayBGM` is commented out in the source.
  music: null,
};
