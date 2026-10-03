import type { MapLighting } from '@/controllers/lighting';
import { DUEL_ARENA_LIGHTS } from './spec';

/** The Duel Arena's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const DUEL_ARENA_LIGHTING: MapLighting = {
  objectLights: DUEL_ARENA_LIGHTS,
};
