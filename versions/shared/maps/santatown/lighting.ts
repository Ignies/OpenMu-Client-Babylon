import type { MapLighting } from '@/controllers/lighting';

/** Santa Town's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const SANTA_TOWN_LIGHTING: MapLighting = {
  look: {
    sky: {
      zenith: [0.5, 0.62, 0.82],
      horizon: [0.8, 0.84, 0.9],
      // A snowfall sky has no disc to show through it.
      sun: null,
      clouds: 0.3,
    },
  },
};
