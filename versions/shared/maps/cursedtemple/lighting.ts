import type { MapLighting } from '@/controllers/lighting';
import { CURSED_TEMPLE_LIGHTS } from './spec';

/** Illusion Temple's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const CURSED_TEMPLE_LIGHTING: MapLighting = {
  objectLights: CURSED_TEMPLE_LIGHTS,
};
