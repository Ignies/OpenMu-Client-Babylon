import type { MapLighting } from '@/controllers/lighting';
import { OPEN_SKY } from '../shared/looks';

/** Doppelganger 1's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const DOPPELGANGER1_LIGHTING: MapLighting = {
  look: { sky: OPEN_SKY },
};
