import type { MapLighting } from '@/controllers/lighting';
import { OPEN_SKY } from '../shared/looks';

/**
 * Devil Square's lighting (`MapLayer.lighting`), read by the lighting
 * controller. One row for squares 1-4 (map 9) and 5-7 (map 32): `LoadWorld`
 * folds 32 into 9 (MapManager.cpp:1178).
 */
export const DEVIL_SQUARE_LIGHTING: MapLighting = {
  look: { sky: OPEN_SKY },
};
