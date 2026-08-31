import type { ENUM_WORLD } from './types';
import { maps } from '../maps';

/**
 * Whether an object type on a world is an emitter with no drawn model —
 * `MapLayer.effectOnly` on each map entry (`src/maps/<name>/spec.ts`). The
 * old name for `maps.isEffectOnly`, kept for `MapTileObject`.
 */
export function isEffectOnlyObject(world: ENUM_WORLD, type: number): boolean {
  return maps.isEffectOnly(world, type);
}
