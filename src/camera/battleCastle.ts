import { ENUM_WORLD } from '../common/types';
import type { CameraLayer } from './layer';

/**
 * Valley of Loren under siege rules: the camera base height is pinned at 255
 * and the distance at 1100, whatever the wheel says (CameraUtility.cpp:160-162
 * and 255-259), so the walls never swallow the frame.
 */
export const battleCastleLayer: CameraLayer = {
  name: 'battleCastle',
  worlds: [ENUM_WORLD.WD_30BATTLECASTLE],
  distance: 1100,
  groundHeight: 255,
};
