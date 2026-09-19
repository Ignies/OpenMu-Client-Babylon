import type { World } from '../../ecs/world';
import { bindAbsentModels } from '../shared/objectVariants';

/**
 * Duel Arena (`WD_64DUELARENA`, `World65`/`Object65`) - the one thing this
 * map needs a binding for.
 *
 * `GMDuelArena.cpp` is entirely table data (`spec.ts`) and the map owns no
 * entity of its own; `create` exists only to declare the folder's hole.
 */
export async function createDuelArena(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  // Two type-39 records in the far north-east corner, and `Object65` stops at
  // `Object37.bmd` - it has no `Object40.bmd`. Nothing in the C++ touches 39
  // either.
  bindAbsentModels(terrain.MapTileObjects, [39]);
}
