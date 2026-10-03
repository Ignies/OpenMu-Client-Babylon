import type { MapLighting } from '@/controllers/lighting';
import { KANTURU_SKY } from '../shared/looks';
import { KANTURU1_LIGHTS } from './spec';

/** Kanturu ruins' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const KANTURU_1ST_LIGHTING: MapLighting = {
  look: { sky: KANTURU_SKY },
  objectLights: KANTURU1_LIGHTS,
};
