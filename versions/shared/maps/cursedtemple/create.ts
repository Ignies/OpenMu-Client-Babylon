import type { World } from '@/ecs/world';
import { bindAbsentModels } from '../shared/objectVariants';
import { CursedTempleDragonObject } from './dragonObject';

/**
 * Cursed Temple (`WD_45CURSEDTEMPLE_LV1 … LV6`, `World47`/`Object47`) - the
 * two things this map needs a binding for.
 *
 * Every other runtime behaviour `w_CursedTemple.cpp` gives an object is table
 * data in `spec.ts`. The dragon (62) hangs its eye cards on its bones
 * (`dragonObject.ts`), and the folder has a single hole.
 */
export async function createCursedTemple(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  terrain.MapTileObjects[62] = CursedTempleDragonObject;

  // EncTerrain47.obj places three type-81 records and `Object47` has no
  // `Object82.bmd` for them.
  bindAbsentModels(terrain.MapTileObjects, [81]);
}
