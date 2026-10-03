import type { MapLighting } from '@/controllers/lighting';
import { OPEN_SKY } from '../shared/looks';
import { EMPIRE_GUARDIAN_LIGHTS } from './spec';

/** The Fortress days 1-3 lighting (`MapLayer.lighting`), read by the lighting controller. */
export const EMPIRE_GUARDIAN_LIGHTING: MapLighting = {
  look: { sky: { ...OPEN_SKY, clouds: 0.18 } },
  objectLights: EMPIRE_GUARDIAN_LIGHTS,
};
