import type { World } from '../../ecs/world';
import { bindAbsentModels } from '../shared/objectVariants';

/**
 * Doppelganger 1 (`WD_65DOPPLEGANGER1`, `World66`/`Object66`) - the folder's
 * holes.
 *
 * Everything `GMDoppelGanger1.cpp` does to an object is table data
 * (`spec.ts`); `create` exists only for the four types placed with no model.
 */
export async function createDoppelganger1(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  // 6 (x6), 32 (x13) and 96 (x1) have no `Object07/33/97.bmd` in `Object66`;
  // 247 (x3) is the stacked `MODEL_WARP` editor spill, past
  // `MAX_WORLD_OBJECTS` and so never a folder slot at all.
  bindAbsentModels(terrain.MapTileObjects, [6, 32, 96, 247]);
}
