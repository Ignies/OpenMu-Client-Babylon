import type { MapLighting } from '@/controllers/lighting';
import { OPEN_SKY } from '../shared/looks';
import { LAND_OF_TRIALS_LIGHTS } from './spec';

/** Land of Trials' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const LAND_OF_TRIALS_LIGHTING: MapLighting = {
  look: { sky: OPEN_SKY },
  objectLights: LAND_OF_TRIALS_LIGHTS,
};
