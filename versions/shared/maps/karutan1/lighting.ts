import type { MapLighting } from '@/controllers/lighting';
import { DESERT_SKY } from '../shared/looks';
import { KARUTAN_LIGHTS } from './spec';

/**
 * Karutan's lighting (`MapLayer.lighting`), read by the lighting controller;
 * Karutan 2 uses this row too.
 */
export const KARUTAN_LIGHTING: MapLighting = {
  look: { sky: DESERT_SKY },
  objectLights: KARUTAN_LIGHTS,
};
