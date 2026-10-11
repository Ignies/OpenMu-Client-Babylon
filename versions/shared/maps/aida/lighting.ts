import type { MapLighting } from '@/controllers/lighting';
import { AIDA_LIGHTS } from './spec';

/** Aida's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const AIDA_LIGHTING: MapLighting = {
  look: {
    sky: {
      zenith: [0.34, 0.42, 0.62],
      horizon: [0.62, 0.66, 0.72],
      clouds: 0.22,
      halo: 0.15,
    },
  },
  objectLights: AIDA_LIGHTS,
};
