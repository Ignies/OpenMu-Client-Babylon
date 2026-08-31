import { ENUM_WORLD } from '../types';
import { maps } from '../../maps';

/**
 * Tile textures by slot for a world — `MapLayer.tiles`, declared on each
 * entry in `src/maps/<name>/index.ts`. Kept under its old name for the
 * terrain loaders; the facade's `maps.tiles(world)` is the same reader.
 */
export function getTilesList(map: ENUM_WORLD): string[] {
  return [...maps.tiles(map)];
}
