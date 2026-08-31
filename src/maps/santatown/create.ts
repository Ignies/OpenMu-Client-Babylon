import type { World } from '../../ecs/world';
import { PlaySpeedObject } from '../shared/objectVariants';

/**
 * Santa Village (`WD_62SANTA_TOWN`, `World63`/`Object63`).
 *
 * `CGMSantaTown::CreateObject` (GMSantaTown.cpp:40-52): 12/13/18/19/21/25
 * get `CollisionRange = -300` (unpickable; no hook). `MoveObject` (:75-99):
 * 16 (×0 placed) `Velocity = 0.06`; 26-28 hidden (`spec.ts`).
 *
 * Snow: `g_SantaTown.CreateSnow` is the leaves slot, so the world joins
 * `SNOW_MAPS`. `Music/Santa_Village`; no bed. Not an OpenMU spawn-gate map —
 * the offline spawn is the village square.
 */
export async function createSantaTown(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // GMSantaTown.cpp:80-85.
  tiles[16] = PlaySpeedObject.at(0.06);
}
