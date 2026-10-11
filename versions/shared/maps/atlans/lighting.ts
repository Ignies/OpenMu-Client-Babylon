import type { MapLighting } from '@/controllers/lighting';
import { ENCLOSED_SUN_SHARE, sun } from '../shared/looks';
import { ATLANS_LIGHTS } from './spec';

/** Atlans' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const ATLANS_LIGHTING: MapLighting = {
  look: {
    ev: 1.2,
    whiteBalance: [0.94, 1.0, 1.04],
    // Skyless: the haze is the water's own murk, in its colour, and it
    // starts past the hero like every other map's (a 4-tile start veiled the
    // whole frame: lrms 0.012).
    sky: null,
    fog: { start: 25, density: 0.03, cap: 0.85, height: 0.02, color: [0.2, 0.46, 0.54] },
    sun: sun(0, 80, ENCLOSED_SUN_SHARE),
  },
  objectLights: ATLANS_LIGHTS,
};
