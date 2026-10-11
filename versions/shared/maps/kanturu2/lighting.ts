import type { MapLighting } from '@/controllers/lighting';
import { KANTURU_SKY } from '../shared/looks';
import { KANTURU2_LIGHTS } from './spec';

/** Kanturu relics' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const KANTURU_2ND_LIGHTING: MapLighting = {
  look: { sky: KANTURU_SKY },
  objectLights: KANTURU2_LIGHTS,
};
