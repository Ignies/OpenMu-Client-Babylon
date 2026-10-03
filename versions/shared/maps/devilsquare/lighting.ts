import type { MapLighting } from '@/controllers/lighting';
import { ENUM_WORLD } from '@/core/types';
import { OPEN_SKY } from '../shared/looks';

/**
 * Devil Square's lighting (`MapLayer.lighting`), read by the lighting
 * controller. Only squares 1-4 name the open sky; 5-7 (map 32) take the
 * controller's default.
 */
export const DEVIL_SQUARE_LIGHTING: MapLighting = {
  look: { byWorld: { [ENUM_WORLD.WD_9DEVILSQUARE]: { sky: OPEN_SKY } } },
};
