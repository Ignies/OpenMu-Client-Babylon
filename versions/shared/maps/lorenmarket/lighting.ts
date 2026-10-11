import type { MapLighting } from '@/controllers/lighting';
import { OPEN_SKY } from '../shared/looks';
import { LOREN_MARKET_LIGHTS } from './spec';

/** Loren Market's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const LOREN_MARKET_LIGHTING: MapLighting = {
  look: { sky: { ...OPEN_SKY, clouds: 0.18 } },
  objectLights: LOREN_MARKET_LIGHTS,
};
