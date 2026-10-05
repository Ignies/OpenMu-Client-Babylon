import { OperateBoxObject } from '@/controllers/actors/operateBoxObject';
import type { World } from '@/ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';

/**
 * Elbeland (`WD_51ELBELAND`, `World52`/`Object52`) - the elf town.
 *
 * `GMNewTown::CreateObject` (GMNewTown.cpp:49-85): 103 (×19) is
 * `CreateOperate` - the benches; thirteen tree/rock types get
 * `CollisionRange = -300` (unpickable - no hook for that in `ModelObject`,
 * they stay pickable). `MoveObject` (:87-191): the fire pits, lamps, falls
 * and mist in `spec.ts`; the V scrolls on 2/53/55 (`+0.015` per 25 Hz tick)
 * and 89 (`+0.005`) and the 56 sine in the `render.meshAnimations` rows; 56's `Velocity =
 * 0.05` here.
 *
 * `PlayObjectSound` (:193-232) is the seven object loops in `sound.ts`,
 * safe-zone gating included. The map has no world bed and no
 * `PlayWorldAmbientSounds` case, so its `sound` row has no `beds`.
 *
 * Not built:
 *  - The eagle boids on 62, the decorative monsters on 133-155, and 110's
 *    sparks orbiting bone 0 on a `WorldTime` circle, which a static-offset
 *    row cannot say (its row is one flare standing in).
 *
 * `Music/elbeland`; clear colour `(178, 178, 178)/256` set by
 * `loadMapIntoScene` (SceneManager.cpp:361).
 */
export async function createElbeland(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GMNewTown.cpp:71-75.
  tiles[103] = OperateBoxObject;
  // :127-131.
  tiles[56] = PlaySpeedObject.at(0.05);
}
