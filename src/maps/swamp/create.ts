import type { World } from '../../ecs/world';
import { SwampMarshGasObject } from './marshGasObject';
import { bindAbsentModels } from '../shared/objectVariants';

/**
 * Swamp of Calmness (`WD_56MAP_SWAMP_OF_QUIET`, `World57`/`Object57`).
 *
 * `CreateObject` (GMSwampOfQuiet.cpp:54-67) is empty - the type 103 operate
 * box is commented out in the original - and `RenderObjectAfterCharacter`
 * (:273-282) is commented out too, so the map owns no prop and no second
 * pass. `MoveObject` (:69-107) and `RenderObjectVisual` (:130-202) are the
 * whole runtime, and six of their seven types are table data in `spec.ts`.
 *
 * This file is the seventh.
 */
export async function createSwamp(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  // GMSwampOfQuiet.cpp:158-169.
  terrain.MapTileObjects[72] = SwampMarshGasObject;

  // Placed once each, and `Object57` has no `Object59/60/65.bmd` for them.
  bindAbsentModels(terrain.MapTileObjects, [58, 59, 64]);
}
