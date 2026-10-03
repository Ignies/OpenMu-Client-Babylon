import type { MapLighting } from '@/controllers/lighting';
import { OPEN_SKY, sun } from '../shared/looks';
import { STADIUM_LIGHTS } from './spec';

/** The Stadium's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const STADIUM_LIGHTING: MapLighting = {
  look: {
    ev: 1.4,
    whiteBalance: [1, 1, 1],
    sky: { ...OPEN_SKY, clouds: 0.12 },
    fog: { start: 25, density: 0.006, cap: 0.8, height: 0, color: [0.74, 0.76, 0.8] },
    sun: sun(215, 50),
  },
  objectLights: STADIUM_LIGHTS,
};
