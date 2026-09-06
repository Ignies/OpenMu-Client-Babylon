import { ENUM_WORLD } from '../common/types';
import type { CameraLayer } from './layer';

/**
 * Valley of Loren under siege rules: the camera base height is pinned at 255
 * (CameraUtility.cpp:160-162), so the walls never swallow the frame however
 * high the ground under the hero gets. The original also pinned the distance
 * at 1100 whatever the wheel said (:255-259); here that is the opening frame
 * and the wheel is left alone - the map is walked around on far more often
 * than it is besieged.
 */
export const battleCastleLayer: CameraLayer = {
  name: 'battleCastle',
  worlds: [ENUM_WORLD.WD_30BATTLECASTLE],
  distance: 1100,
  groundHeight: 255,
};
