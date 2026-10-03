import type { MapLighting } from '@/controllers/lighting';
import { OPEN_SKY } from '../shared/looks';

/**
 * Chaos Castle's lighting (`MapLayer.lighting`), read by the lighting
 * controller. One row for every arena: `InChaosCastle()` takes 18-23 and 53
 * alike and `LoadWorld` draws them all from World19 (MapManager.cpp:1217, 1575).
 */
export const CHAOS_CASTLE_LIGHTING: MapLighting = {
  look: { sky: OPEN_SKY },
};
