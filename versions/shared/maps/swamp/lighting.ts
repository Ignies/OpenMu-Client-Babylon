import type { MapLighting } from '@/controllers/lighting';
import { SWAMP_LIGHTS } from './spec';

/** The Swamp of Calmness' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const SWAMP_LIGHTING: MapLighting = {
  look: {
    sky: {
      zenith: [0.4, 0.5, 0.6],
      horizon: [0.68, 0.7, 0.64],
      clouds: 0.26,
      halo: 0.15,
    },
  },
  objectLights: SWAMP_LIGHTS,
};
