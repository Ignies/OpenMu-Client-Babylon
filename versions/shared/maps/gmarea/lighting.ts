import type { MapLighting } from '@/controllers/lighting';
import { KANTURU1_LIGHTS } from '../kanturu1/spec';

/**
 * The GM area's lighting (`MapLayer.lighting`), read by the lighting
 * controller: its objects are the Kanturu ruins' and light the same.
 */
export const GM_AREA_LIGHTING: MapLighting = {
  objectLights: KANTURU1_LIGHTS,
};
