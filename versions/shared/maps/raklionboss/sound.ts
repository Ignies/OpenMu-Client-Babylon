import type { MapSound } from '@/controllers/sound';
import { SNOW_STEPS, WIND } from '../shared/sound';
import { RAKLION } from '../raklion/sound';

/** Raklion's hatchery sound (`MapLayer.sound`), read by the sound controller. */
export const RAKLION_BOSS_SOUND: MapSound = {
  footsteps: SNOW_STEPS,
  // Wind (SceneManager.cpp:620-622).
  beds: [WIND],
  // `CGM_Raklion::PlayBGM` (GM_Raklion.cpp:2938-2945) plays it only between
  // RAKLION_STATE_READY and _END, from 0xD1 0x10-0x12; neither this client
  // nor OpenMU has those packets, so it plays unconditionally.
  music: 'Music/Raklion_Hatchery',
  // `IsIceCity()` - Raklion and its boss room (GM_Raklion.cpp:2294-2299).
  monsterCues: RAKLION,
};
