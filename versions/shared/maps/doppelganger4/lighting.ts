import type { MapLighting } from '@/controllers/lighting';
import { DOPPELGANGER4_LIGHTS } from './spec';

/** Doppelganger 4's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const DOPPELGANGER4_LIGHTING: MapLighting = {
  objectLights: DOPPELGANGER4_LIGHTS,
};
