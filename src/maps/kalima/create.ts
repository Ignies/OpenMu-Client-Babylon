import type { World } from '../../ecs/world';
import { KalimaWaterPlantObject } from './grassObject';

/**
 * Kalima (`WD_24HELLAS … _END` + Kalima 7 = world 36, all on `World25` /
 * `Object25`). Its C++ is GMHellas.cpp, and almost none of it is object
 * behaviour: `CreateHellasObject` (:379) is `return false`,
 * `MoveHellasObject` and `MoveHellasAllObject` (:362, :372) are never called
 * at all, and `MoveHellasVisual` (:384) only flags four types hidden. The
 * blend meshes, the six hidden emitters, the two crystal flares and the
 * waterfall loop are tables in `spec.ts`. This file is the one type family
 * that needs a class.
 *
 * Because `MoveHellasVisual` and `RenderHellasVisual` both `return true`
 * unconditionally in this world (ZzzObject.cpp:4190, :3232 short-circuit on
 * it), no generic per-type case in `MoveObject` / `RenderObjectVisual` ever
 * runs on Kalima: GMHellas.cpp is the whole of it.
 *
 * **Not implemented, deliberately:**
 *
 *  - **The wet pass.** `RenderHellasObjectMesh` (:586-598) draws *every* map
 *    object a second time at alpha 0.3 over `BITMAP_WATER + WaterTextureNumber`
 *    - the 16-frame scrolling water texture - with `BodyLight` pulsed on
 *    `sin(WorldTime * 0.002) * 0.1 + 0.3`, skipping types 2, 4, 12, 14, 15,
 *    18, 20, 21, 27, 29, 30, 31, 32, 41, 43, 52, 54 and 55. It is the single
 *    loudest thing about how Kalima looks - the whole cave reads as wet - and
 *    it is a per-object second render pass over a shared animated texture, not
 *    anything a map table can hold. Same class of omission as Tarkan's
 *    sandstorm overlay; it wants a renderer feature, and the exclusion list
 *    above is the data it would need.
 *  - **Type 34's chrome pass** (:600-608), x10: mesh 1 redrawn
 *    `RENDER_CHROME | RENDER_BRIGHT`. The port has no per-object chrome pass;
 *    the same note already stands on Lost Tower 3/4/19/20 and Tarkan 81.
 *  - **The dark shadowmap pass** on 15, 29 and 32 (:610-616): after the wet
 *    pass those three are drawn once more with `BodyLight` forced to 0.1 and
 *    `RENDER_SHADOWMAP`, which is how the original grounds a plant standing in
 *    water it draws no shadow onto. Meaningless without the wet pass above,
 *    and the clone shadows map objects through CSM instead.
 *  - **The water surface itself.** `CSWaterTerrain` (GMHellas.cpp:44-126) is a
 *    64x64 wave mesh at a flat 350 MU, two passes over `Object25/water1` and
 *    `water2`, present on every Kalima floor. `libs/mu/terrainWater.ts` has
 *    the wave field ported (it is Atlans' today) and says as much; the plants
 *    here already read their height out of it. Kalima needs a *plane* rather
 *    than a terrain-layer displacement, so it is a line in that registry plus
 *    a mesh, and both are outside this folder.
 *  - **The Bahamut fly-past.** `CreateBigMon` / `MoveBigMon` (:631-684) put one
 *    `MONSTER_MODEL_BAHAMUT` in the air every 4 s, scaled 2.5, drifting past
 *    below and behind the hero and fading out at the end of its 200-tick life.
 *    It is a boid, spawned from `MoveBoids` (GOBoid.cpp:1367) - the clone's
 *    `common/boids.ts` has no Kalima row, and adding one is a shared-file
 *    change, not a map object.
 *  - **The hero-relative motes** (`MoveHellasObjectSetting`, :331-357): a
 *    `BITMAP_LIGHT` SubType 7 within +-4 tiles of the hero on a 1-in-5 tick,
 *    and one in fifteen of those also drops `CreateEffect(9)` 800 above with
 *    the falling-stone sound. The sound is already a one-shot in
 *    `sound/ambientBeds.ts`; the motes want a hero-relative weather recipe
 *    that does not exist yet.
 *  - **Kundun's roar** in the boss room (:319-329, tiles 25-51 x 44-119 on
 *    floor 7 only): needs the floor number, which is the server's, not the
 *    map's.
 */
export async function createKalima(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // 15 (x13), 29 (x287) and 32 (x19): the water plants, all three routed to
  // `CheckGrass` (GMHellas.cpp:447-461). 32 is also one of the two crystal
  // flares - that half is `KALIMA_LIGHTS` in spec.ts and is attached to the
  // entity, not to the class, so the two do not collide.
  tiles[15] = KalimaWaterPlantObject;
  tiles[29] = KalimaWaterPlantObject;
  tiles[32] = KalimaWaterPlantObject;
}
