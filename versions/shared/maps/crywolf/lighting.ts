import type { MapLighting } from '@/controllers/lighting';
import { CRYWOLF_LIGHTS } from './spec';

/** Crywolf's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const CRYWOLF_LIGHTING: MapLighting = {
  look: {
    sky: {
      zenith: [0.45, 0.56, 0.78],
      horizon: [0.72, 0.72, 0.74],
      clouds: 0.24,
    },
  },
  objectLights: CRYWOLF_LIGHTS,
};
