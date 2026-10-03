import type { MapSound } from '@/controllers/sound';

/** Valley of Loren's sound (`MapLayer.sound`), read by the sound controller. */
export const VALLEY_OF_LOREN_SOUND: MapSound = {
  // `SOUND_BC_AMBIENT` (GMBattleCastle.cpp:729), loaded looping.
  beds: [{ sound: 'Sound/battlecastle/aSiegeAmbi', volume: 0.4 }],
  // `MUSIC_CASTLE_PEACE`. `charge` while `IsBattleCastleStart()`
  // (GMBattleCastle.cpp:716-733) needs the siege start/end packet
  // (0xB2 0x17), which nothing here tracks and OpenMU never sends.
  music: 'Music/castle',
};
