import type { MapSound } from '@/controllers/sound';
import { BALGAS_BARRACK, CHANGE_UP_LOOPS } from '../balgasbarracks/sound';

/**
 * Balgas Refuge's sound (`MapLayer.sound`), read by the sound controller.
 * The Barracks' object hook and monster hook run here too.
 */
export const BALGAS_REFUGE_SOUND: MapSound = {
  music: 'Music/BalgasRefuge',
  objectLoops: CHANGE_UP_LOOPS,
  // `IsBalgasBarrackMap() || IsBalgasRefugeMap()` (GM3rdChangeUp.cpp:810).
  monsterCues: BALGAS_BARRACK,
};
