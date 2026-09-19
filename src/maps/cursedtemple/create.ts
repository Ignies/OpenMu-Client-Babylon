import type { World } from '../../ecs/world';
import { bindAbsentModels } from '../shared/objectVariants';

/**
 * Cursed Temple (`WD_45CURSEDTEMPLE_LV1 … LV6`, `World47`/`Object47`) - the
 * one thing this map needs a binding for.
 *
 * Every runtime behaviour `w_CursedTemple.cpp` gives an object is table data
 * in `spec.ts`; `create` exists only to declare the folder's single hole.
 */
export async function createCursedTemple(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  // EncTerrain47.obj places three type-81 records and `Object47` has no
  // `Object82.bmd` for them.
  bindAbsentModels(terrain.MapTileObjects, [81]);
}
