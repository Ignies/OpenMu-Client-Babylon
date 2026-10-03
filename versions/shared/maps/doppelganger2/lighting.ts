import type { MapLighting } from '@/controllers/lighting';
import { DOPPELGANGER2_LIGHTS } from './spec';

/** Doppelganger 2's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const DOPPELGANGER2_LIGHTING: MapLighting = {
  objectLights: DOPPELGANGER2_LIGHTS,
};
