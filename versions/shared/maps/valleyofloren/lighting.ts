import type { MapLighting } from '@/controllers/lighting';
import { OPEN_SKY } from '../shared/looks';

/** Valley of Loren's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const VALLEY_OF_LOREN_LIGHTING: MapLighting = {
  look: { sky: { ...OPEN_SKY, clouds: 0.16 } },
};
