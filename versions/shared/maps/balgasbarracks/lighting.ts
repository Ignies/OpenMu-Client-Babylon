import type { MapLighting } from '@/controllers/lighting';
import { BALGAS_LIGHTS } from './spec';

/**
 * Balgas Barracks' lighting (`MapLayer.lighting`), read by the lighting
 * controller; the Refuge uses this row too.
 */
export const BALGAS_LIGHTING: MapLighting = {
  objectLights: BALGAS_LIGHTS,
};
