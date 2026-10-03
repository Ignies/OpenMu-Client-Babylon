import type { MapLighting } from '@/controllers/lighting';
import { VULCANUS_LIGHTS } from './spec';

/** Vulcanus' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const VULCANUS_LIGHTING: MapLighting = {
  look: {
    sky: {
      zenith: [0.44, 0.44, 0.54],
      horizon: [0.82, 0.66, 0.56],
      sun: [1.0, 0.82, 0.62],
      clouds: 0.24,
    },
  },
  objectLights: VULCANUS_LIGHTS,
};
