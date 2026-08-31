import { LeanBoxObject } from '../../common/operateBoxObject';
import type { World } from '../../ecs/world';

/**
 * Dungeon (World 2 / `Object2`). Almost the whole map is the default
 * `MapTileObject`: `CreateObject` (ZzzObject.cpp:4605-4617) touches exactly
 * two of the 61 types present in EncTerrain2.obj, and `MoveObject`
 * (ZzzObject.cpp:3822-3849) another seven. Everything those cases need is
 * table data and lives in `spec.ts` (blend meshes, effect-only markers,
 * particles, torch lights) or in `common/meshAnimation.ts` (the 22/23/24
 * UV scroll); this file is only the two class assignments and the notes on
 * what the original does here that we do not.
 *
 * Not implemented, deliberately:
 *
 *  - **Bats and rats.** `Object2/Bat01.glb` and `Object2/Rat01.glb` are
 *    ambient wildlife, flocked by the original's boid code rather than placed
 *    in the object list — which is why neither appears in EncTerrain2.obj.
 *    The clone has no boid system and this map is not the place to grow one.
 *  - **The type 52 rock-fall as real falling models.** See the long note on
 *    `DUNGEON_EMISSIONS` in `spec.ts`: it runs as particles until an
 *    effect-model system exists.
 *
 * No fog, no `clearColor` override and no camera change: the original sets
 * none for Dungeon. The dark is the baked `TerrainLight.OZJ` plus the 120
 * torch terrain lights from `DUNGEON_LIGHTS`, and adding a grade on top would
 * flatten exactly the contrast those torches are there to create.
 *
 * Skinned types (11, 16, 18, 22-24, 35, 40, 43) need no action start here:
 * `loadGLTF` reproduces the glTF loader's `animationStartMode = FIRST` and
 * plays clip 0 looping on every instance and clone (modelLoader.ts:471-481),
 * which is what the original's single-action map objects do. Their *rate* is
 * a separate, map-agnostic matter — `ModelObject.AnimationSpeed` defaults to
 * the 0.28 player idle speed where `CreateObject` gives every map object
 * `o->Velocity = 0.16f` (ZzzObject.cpp:4470), so every map object in the port
 * animates ~1.75× fast. That is shared-code work, not a Dungeon fix.
 */
export async function createDungeon(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // Dungeon 59 (ZzzObject.cpp:4608-4610), the sittable stone ledge — 30 of
  // them, in clusters of three to five around the six rest spots. The
  // original only calls `CreateOperate(o)`: the model draws normally and the
  // object joins the operate list, which `ObjectCollisionCheck` uses to route
  // a click into the sit pose. Nothing in this clone consumes that list yet
  // (combat and UI work), so the default `MapTileObject` is already the whole of the
  // visible behaviour and the type is left unassigned on purpose — a class
  // that only re-loaded `Object60.glb` would be a class that does nothing.

  // Dungeon 60 (ZzzObject.cpp:4611-4615): `CreateOperate` + the explicit
  // `Vector(40.f, 40.f, 160.f, o->BoundingBoxMax)` + `HiddenMesh = -2`, the
  // shared lean-pose trigger. Nine of them, all at scale 0.8, each paired
  // with a 59 cluster.
  //
  // `Data/Object2/Object61.bmd` does not exist — Object2 stops at Object60,
  // and the original never notices because it draws nothing here anyway.
  // `OperateBoxObject.init()` already swallows a failed model load and keeps
  // the pick box (the box is what the click ray hits, not the mesh), so
  // `LeanBoxObject` is correct as-is and needs no Dungeon subclass.
  tiles[60] = LeanBoxObject;
}
