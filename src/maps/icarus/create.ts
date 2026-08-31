import type { World } from '../../ecs/world';
import { IcarusCloudObject } from './cloudObject';
import { IcarusSky } from './sky';
import { ICARUS_EFFECT_ONLY_TYPES } from './spec';

/**
 * Icarus (World 10 / `WD_10HEAVEN`, assets `Object11`/`World11`) — the sky map.
 * No terrain is drawn; islands, pillars and cloud banks hang in a dark navy
 * void, it rains without stopping, and lightning goes off overhead.
 *
 * Almost nothing here is per-object: `CreateObject` has no `case
 * WD_10HEAVEN`, so no Icarus type gets a pick box, a blend mesh or an operate
 * flag, and `MoveObject` is a bare `case WD_10HEAVEN: break;`. Everything the
 * world does at runtime is either in `RenderObjectVisual`
 * (ZzzObject.cpp:3052-3153) — the cloud banks on types 0-5 and the orb on
 * type 10 — or world-level and hero-relative, which is `IcarusSky`.
 *
 * What lives outside this directory, and why:
 *  - `spec.ts`'s `ICARUS_LIGHTS` is the type 10 orb, registered through
 *    `effectLights.ts` like every other map's lights; it needs no code.
 *  - the clear colour is `icarusLayer.clearColor` (index.ts); the hidden
 *    terrain mesh is `loadMapIntoScene`'s one Icarus special case.
 *  - the rain is `AmbientParticleSystem`'s `RAIN` recipe, which Icarus runs
 *    unconditionally (`MoveLeaves` forces `RainTarget = MAX_LEAVES / 2` for
 *    this world, ZzzEffectFireLeave.cpp:424) rather than on the weather byte.
 */
export async function createIcarus(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  // `+90.f` instead of every other map's `+30.f` (CameraUtility.cpp:103).
  // The terrain mesh itself is hidden — `RenderTerrain` is skipped outright
  // for this world (MainScene.cpp:402; `loadMapIntoScene` sets it invisible)
  // — but its height map is still sampled, for characters and for the rain.
  terrain.extraHeight = 0.9;

  const tiles = terrain.MapTileObjects;

  // Types 0-5 are six copies of one 50 MU smoke box, every one of them hidden
  // on sight and replaced by a bank of cloud billboards. `IcarusCloudObject`
  // skips the model entirely — see the class, and `ICARUS_EFFECT_ONLY_TYPES`.
  for (const type of ICARUS_EFFECT_ONLY_TYPES) {
    tiles[type] = IcarusCloudObject;
  }

  const sky = new IcarusSky(world);

  // `unloadMap` calls `onDispose` on every entity belonging to the world it is
  // leaving, which is the only teardown hook a map module gets.
  world.add({
    worldIndex: world.mapIndex,
    onDispose: () => sky.dispose(),
  });
}
