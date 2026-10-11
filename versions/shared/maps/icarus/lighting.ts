import type { MapLighting } from '@/controllers/lighting';
import { NO_FOG, sun } from '../shared/looks';
import { ICARUS_LIGHTS } from './spec';

/** Icarus' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const ICARUS_LIGHTING: MapLighting = {
  look: {
    // The map has an authored clear colour and no ground (MainScene.cpp:402).
    ev: 0.6,
    whiteBalance: [0.97, 0.99, 1.04],
    sky: null,
    fog: NO_FOG,
    sun: sun(200, 40),
  },
  objectLights: ICARUS_LIGHTS,
  // `MoveHeavenThunder` (ZzzObject.cpp:4204): the strike's flash; the timing
  // is `sky.ts` here.
  thunder: true,
};
