import type { World } from '@/ecs/world';
import { AlphaObject } from '../shared/objectVariants';
import { BalgasFirePillarObject } from '../balgasbarracks/firePillarObject';
import { BalgasSmokeObject } from '../balgasbarracks/smokeObject';

/**
 * Balgass' Refuge (`WD_42CHANGEUP3RD_2ND`, `World43`/`Object43`) - the
 * quest's final cave, 354 objects.
 *
 * Runs the same `CGM3rdChangeUp::MoveObject` as the Barracks; the tables
 * live in `versions/shared/maps/balgasbarracks/spec.ts` and are registered for this world
 * from there. Per-object: **78** `Alpha = 0.5` (none placed here - kept so
 * the two maps behave identically if the .obj changes) and **92** (×5) the
 * volcano's fire pillar (`balgasbarracks/firePillarObject.ts`); 5 and 85 (none placed) the timer
 * smoke (`balgasbarracks/smokeObject.ts`).
 *
 * This is one of the three `IsTerrainHeightExtMap` worlds (ZzzLodTerrain.cpp
 * :599-602): its `TerrainHeight.OZB` is the 24-bit `OpenTerrainHeightNew`
 * format, which `parseTerrainHeight` now detects by size.
 *
 * Music `Music/BalgasRefuge`. No OpenMU spawn gate - the offline spawn is the
 * Barracks' exit target (104-107 / 178-181).
 */
export async function createBalgasRefuge(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  tiles[78] = AlphaObject.at(0.5);
  tiles[92] = BalgasFirePillarObject;
  tiles[5] = BalgasSmokeObject;
  tiles[85] = BalgasSmokeObject;
}
