# maps

The map registry: the `MapLayer` contract, the `maps` facade that answers questions about a
world, and the room helpers. The maps themselves are content in `versions/shared/maps/<map>/`
(see [docs/content.md](../../../docs/content.md)).

## Public API
- `MapLayer`, `Room`, `Spawn`, `PerWorld`, `ByWorld` (`layer.ts`): the contract one map entry
  implements. `sound`, `lighting`, `weather`, `terrain` are the map's own rows, one field per
  controller; each controller owns its field's type (`MapSound`, `MapLighting`, `MapWeather`,
  `MapTerrain`, exported from that controller's `index.ts`).
- `maps` (`index.ts`, a `Controller`):
  - lifecycle: `create(world)` once per warp, `reset()` on map change, `register(layer)` at
    runtime (returns the unregister).
  - readers: `layerFor`, `all`, `worldsOf`, `worldsWhere`, `assetWorldNum`, `tiles`,
    `cutoutTileFor`, `spawn`, `isOutdoor`, `canRain`, `isSnow`, `isUnderwater`, `clearColorFor`,
    `roomsOf`, `blendMeshFor`, `isEffectOnly`, `emissionsFor`.
  - the map's own rows: `rowFor(world, pick)` (the row resolved for the world), `worldSet(pick)`
    and `worldMap(read)` (live views that ask on every call, for module-level constants).
- `forWorld(row, world)`: a `PerWorld` row as one world sees it.
- `rooms.ts`: `loadRoomRecords(map)`, `enumerateRooms(records, spec)`, `registerRooms(world,
  rooms, spec, hooksFor)`, `roomStructureTypes(map)`, `sameRoom(a, b)`.

## How it works
- `MAP_LAYERS` (`versions/shared/maps/layers.ts`) is the only list of maps. The facade indexes
  it by world and logs an error when two entries claim the same world. Every reader is a lookup
  over the entry's declared data.
- An entry is mostly data: the worlds it serves (event maps serve a range of instances on one
  art set), `assetWorld` when the `Data/World<n>` folder is not `world + 1`
  (`CMapManager::LoadWorld`, MapManager.cpp:1206-1225), tile slots (MapManager.cpp:1362-1420),
  spawn, climate flags, `clearColor` (`SetWorldClearColor`, SceneManager.cpp:336-365), and
  per-object-type tables (`blendMeshes`, `effectOnly`, `emissions`).
- A controller reads a map's row at run time, never at module load: `maps.rowFor(world, l =>
  l.sound?.beds)`. A row is one value for every world the entry serves, or `{ byWorld: {...} }`
  when its worlds differ (Empire Guardian day 2's monsters, the login scenes' music). The live
  `worldSet` / `worldMap` views let a controller keep a `ReadonlySet` constant (a layer's `maps`)
  without reading the list at load, which is what made the old per-controller tables fragile to
  import order.
- `canRain` is the one place that answers "may rain fall here": `outdoor`, and not `rain:
  false`, `snow`, `underwater` or `desert`.
- `create` binds the map's object classes. It is written as a dynamic import
  (`world => import('./create').then(...)`): the classes extend `ModelObject`, whose imports read
  this registry, so a static import is a cycle. `loadMapIntoScene` calls `maps.create`;
  `app/lifecycle.ts` calls `maps.reset`.
- The module declines hot updates, so the singleton is never duplicated.

### Notes
- `cutoutTile` (`layer.ts`): the slot a world fills with `AlphaTile*.Tga` (Elbeland 2, Kanturu 3
  3, Cursed Temple 4, Empire Guardian and the new login scenes 10, Karutan 12). `RenderFace`
  (ZzzLodTerrain.cpp:1394-1435) draws only that slot with the alpha test. The shipped files are
  all-zero TGAs, so the slot means "no ground here": maps use it to cut the terrain out under a
  bridge or platform. The tile named in `tiles` for that slot is never drawn but must be a file
  the folder has, so the `EncTerrain<n>.map` indices stay put.
- Rooms (`rooms.ts`, `roomEnumeration.ts`): `enumerateRooms` is pure. It groups touching roof
  slabs at one height into buildings, frames each with the wall origins under it (a roof with no
  walls is skipped), takes the base from the lowest wall and insets by `floorFromWallLine`.
  `registerRooms` adds one `interactiveArea` per room that sets the area mood on enter and leave,
  and records roof and wall types so prop batching leaves them alone (`roomStructureTypes`).

## Depends on / used by
- uses: `core/types`, `assets` (download, world folder), `terrain/parseTerrainObjects`,
  `lighting/profiles`, `render/scenes/sceneLook`, `versions/shared/maps/layers.ts` (the list).
- used by: `controllers.ts`, `app/lifecycle.ts`, `terrain` (load, tiles, grass), `weather`
  (rain, snow), `lighting` (profiles, director), `render` (blend meshes, effect-only objects,
  prop batches), `fx/effectParticles.ts`, `assets/worldAssets.ts`,
  `ecs/systems/ambientParticleSystem.ts`, every map in `versions/shared/maps/`.

## Change it
- add a map: copy `_template.ts` to `versions/shared/maps/<name>/index.ts` with its data
  (worlds, tiles, spawn, climate, each citing the original), put per-type tables in `spec.ts` and
  object classes plus the setup function in `create.ts`, then add `<name>Layer` to
  `versions/shared/maps/layers.ts`. Runtime state lives in the objects `create` binds, not in the
  entry.
- add a climate or map flag: add the field to `MapLayer` in `layer.ts` and a reader in `index.ts`.
- a new kind of per-map row for a controller: add it to that controller's `Map*` type (not here),
  read it with `maps.rowFor`. A new controller with per-map rows: add one optional field here
  typed from its `index.ts`.
- add rooms to a map: give its `create.ts` a `RoomSpec` and call `loadRoomRecords`,
  `enumerateRooms` and `registerRooms` (see `lorencia/create.ts`).

## Tests
- `versions/shared/maps/mapRows.golden.test.ts`: every per-map row the sound, lighting, weather
  and terrain controllers answer, for every world.
- `maps.test.ts`: `rowFor` / `forWorld` per world, the live `worldSet` / `worldMap` views and
  that they follow `register`.
- `roomEnumeration.test.ts`: buildings from roof slabs and wall lines, base from the lowest wall,
  separate buildings, roofs without walls, other storeys, matching rooms by centre.
- `versions/shared/maps/tileFiles.test.ts`: every tile slot names a file in its world folder.
