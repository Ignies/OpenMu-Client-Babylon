import type { MapLighting } from '@/controllers/lighting';
import { LOST_TOWER_LIGHTS } from './spec';

/** Lost Tower's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const LOST_TOWER_LIGHTING: MapLighting = {
  look: { over: 'enclosed', ev: 0.9, whiteBalance: [0.98, 0.98, 1.03] },
  objectLights: LOST_TOWER_LIGHTS,
};
