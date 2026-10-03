import type { MapSound } from '@/controllers/sound';
import { KARUTAN } from '../karutan1/sound';

/** Karutan 2's sound (`MapLayer.sound`), read by the sound controller. */
export const KARUTAN_2_SOUND: MapSound = {
  // SceneManager.cpp:630-645 (ASG_ADD_MAP_KARUTAN): the desert loop gives
  // way to the Kardamahal entrance loop on tile 12.
  beds: [
    {
      sound: 'Sound/Karutan/Karutan_desert_env',
      volume: 0.4,
      mutedOn: tile => tile === 12,
    },
    {
      sound: 'Sound/Karutan/Kardamahal_entrance_env',
      volume: 0.4,
      mutedOn: tile => tile !== 12,
    },
  ],
  music: 'Music/Karutan_B',
  // `IsKarutanMap()` (GMKarutan1.cpp:876-879).
  monsterCues: KARUTAN,
};
