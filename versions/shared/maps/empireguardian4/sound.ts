import type { MapSound } from '@/controllers/sound';
import { EMPIRE_GUARDIAN } from '../empireguardian/sound';

/** The Fortress day 4 sound (`MapLayer.sound`), read by the sound controller. */
export const EMPIRE_GUARDIAN_4_SOUND: MapSound = {
  // `ImperialGuardianFort_in`, re-issued by every object every frame
  // (GMEmpireGuardian1.cpp:2962-2966) on the default four channels
  // (MapManager.cpp:830), so the original stacks copies a frame apart; one
  // bed here. Days 1-3 play `_out1/2/3` by the weather byte of the 0xF7 0x02
  // enter result, which nothing here receives; weather 0 plays nothing.
  beds: [{ sound: 'Sound/w69w70w71w72/ImperialGuardianFort_in', volume: 0.4 }],
  music: 'Music/ImperialGuardianFort',
  monsterCues: EMPIRE_GUARDIAN,
};
