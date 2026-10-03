import type { MapLighting } from '@/controllers/lighting';
import { KALIMA_LIGHTS } from './spec';

/** Kalima's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const KALIMA_LIGHTING: MapLighting = {
  objectLights: KALIMA_LIGHTS,
};
