import type { MapLighting } from '@/controllers/lighting';

/** Raklion's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const RAKLION_LIGHTING: MapLighting = {
  look: {
    sky: {
      zenith: [0.52, 0.64, 0.84],
      horizon: [0.74, 0.8, 0.88],
      clouds: 0.2,
    },
  },
};
