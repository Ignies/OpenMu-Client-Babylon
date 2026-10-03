import type { MapLighting } from '@/controllers/lighting';
import { DUNGEON_LIGHTS } from './spec';

/** The Dungeon's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const DUNGEON_LIGHTING: MapLighting = {
  look: { over: 'enclosed', ev: 1.0 },
  objectLights: DUNGEON_LIGHTS,
};
