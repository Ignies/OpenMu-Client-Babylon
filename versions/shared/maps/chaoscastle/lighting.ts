import type { MapLighting } from '@/controllers/lighting';
import { ENUM_WORLD } from '@/core/types';
import { OPEN_SKY } from '../shared/looks';

/**
 * Chaos Castle's lighting (`MapLayer.lighting`), read by the lighting
 * controller. Only the first arena names the open sky; the others take the
 * controller's default.
 */
export const CHAOS_CASTLE_LIGHTING: MapLighting = {
  look: { byWorld: { [ENUM_WORLD.WD_18CHAOS_CASTLE]: { sky: OPEN_SKY } } },
};
