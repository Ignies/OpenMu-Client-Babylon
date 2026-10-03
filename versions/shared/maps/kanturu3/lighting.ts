import type { MapLighting } from '@/controllers/lighting';
import { KANTURU3_LIGHTS } from './spec';

/** The Kanturu tower's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const KANTURU_3RD_LIGHTING: MapLighting = {
  objectLights: KANTURU3_LIGHTS,
};
