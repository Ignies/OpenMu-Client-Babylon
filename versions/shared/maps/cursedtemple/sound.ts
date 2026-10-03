import type { MapSound } from '@/controllers/sound';

/** Illusion Temple's sound (`MapLayer.sound`), read by the sound controller. */
export const CURSED_TEMPLE_SOUND: MapSound = {
  // `g_CursedTemple->PlayBGM()` (w_CursedTemple.cpp:1115-1136) turns on the
  // temple state from 0xBF 0x09, a packet neither this client nor OpenMU
  // has; the waiting track stands in for it.
  music: 'Music/cursedtemplewait',
};
