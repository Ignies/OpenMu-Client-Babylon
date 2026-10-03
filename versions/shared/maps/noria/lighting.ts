import type { MapLighting } from '@/controllers/lighting';
import { NOON_SUN, OPEN_HAZE } from '../shared/looks';
import { NORIA_LIGHTS } from './spec';

/** Noria's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const NORIA_LIGHTING: MapLighting = {
  look: {
    ev: 1.5,
    whiteBalance: [0.98, 1.02, 0.98],
    sky: { zenith: [0.30, 0.53, 0.85], horizon: [0.74, 0.83, 0.84], clouds: 0.14 },
    fog: { ...OPEN_HAZE, color: [0.72, 0.78, 0.72] },
    sun: NOON_SUN,
  },
  objectLights: NORIA_LIGHTS,
};
