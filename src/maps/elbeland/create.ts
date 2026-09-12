import { OperateBoxObject } from '../../common/operateBoxObject';
import type { World } from '../../ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';

/**
 * Elbeland (`WD_51ELBELAND`, `World52`/`Object52`) — the elf town.
 *
 * `GMNewTown::CreateObject` (GMNewTown.cpp:49-85): 103 (×19) is
 * `CreateOperate` — the benches; thirteen tree/rock types get
 * `CollisionRange = -300` (unpickable — no hook for that in `ModelObject`,
 * they stay pickable). `MoveObject` (:87-191): the fire pits, lamps, falls
 * and mist in `spec.ts`; the V scrolls on 2/53/55 (`+0.015` per 25 Hz tick)
 * and 89 (`+0.005`) and the 56 sine in `meshAnimation.ts`; 56's `Velocity =
 * 0.05` here.
 *
 * `PlayObjectSound` (:193-232) is the seven object loops in
 * `sound/objectLoops.ts`, safe-zone gating included. The map has no world
 * bed and no `PlayWorldAmbientSounds` case, so `ambientBeds.ts` carries
 * nothing for it.
 *
 * Not built:
 *  - The eagle boids on 62, the decorative monsters on 133-155, the
 *    bone-anchored sprite rows on 30/110/121 beyond one flare each. 110 has
 *    no `ELBELAND_LIGHTS` row at all: its sprite orbits bone 0 on a
 *    `WorldTime` circle, which the static-offset emitter cannot say.
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
