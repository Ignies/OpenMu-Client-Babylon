import { ENUM_WORLD } from '../common/types';
import type { CameraLayer } from './layer';

/**
 * Doppelganger 1 and 2 force camera level 5 the way PK Field does
 * (CameraUtility.cpp:146-149): distance 2000 via CDirection.cpp:72.
 */
export const doppelgangerLayer: CameraLayer = {
  name: 'doppelganger',
  worlds: [
    ENUM_WORLD.WD_65DOPPLEGANGER1,
    ENUM_WORLD.WD_66DOPPLEGANGER2,
  ],
  distance: 2000,
};
