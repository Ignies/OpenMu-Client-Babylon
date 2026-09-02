import { ENUM_WORLD } from '../common/types';
import type { CameraLayer } from './layer';

/**
 * PK Field forces camera level 5 (CameraUtility.cpp:142-144), whose distance
 * is the direction system's default 2000 (CDirection.cpp:72) - the pulled-back
 * arena view.
 */
export const pkFieldLayer: CameraLayer = {
  name: 'pkField',
  worlds: [ENUM_WORLD.WD_63PK_FIELD],
  distance: 2000,
};
