import type { MapLighting } from '@/controllers/lighting';
import { sun } from '../shared/looks';
import { TARKAN_LIGHTS } from './spec';

/** Tarkan's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const TARKAN_LIGHTING: MapLighting = {
  look: {
    ev: 1.2,
    whiteBalance: [1.04, 1.0, 0.94],
    sky: {
      zenith: [0.40, 0.58, 0.86],
      horizon: [0.90, 0.84, 0.70],
      sun: [1.0, 0.94, 0.8],
      halo: 0.35,
      clouds: 0.06,
    },
    fog: { start: 25, density: 0.01, cap: 0.9, height: 0, color: [0.86, 0.8, 0.66] },
    sun: sun(220, 55),
  },
  objectLights: TARKAN_LIGHTS,
};
