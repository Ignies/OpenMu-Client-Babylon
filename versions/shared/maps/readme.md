# maps

One folder per map. Each folder exports one `MapLayer` (the contract in
`src/controllers/maps/layer.ts`); `layers.ts` lists them all.

## Public API
- `MAP_LAYERS` (`layers.ts`): every map the client can load, in `ENUM_WORLD` order. The only list
  of maps; there is no `switch (map)` anywhere else.
- `FULL_TILES`, `ROCK04_TILES`, `ROCK02_TILES` (`recipes.ts`): common tile-slot lists.
- `shared/objectVariants.ts`: `AlphaObject.at(k)`, `PlaySpeedObject.at(k)`, `AbsentModelObject`,
  `bindAbsentModels(...)`: per-type settings without a subclass per map.
- `shared/sound.ts` (`WIND`, `smallLoop` / `largeLoop`, `outsideSafeZone`, the monster hook
  shorthands `hookWalk` / `hookOnce` / `hookPlay` / `oneChannel`), `shared/looks.ts` (`OPEN_SKY`,
  `KANTURU_SKY`, `DESERT_SKY`, `GRADED_HAZE`, `sun`...), `shared/lights.ts` (`createFire`),
  `shared/terrain.ts` (`sit`, `pose`, `healing`): plain building blocks the map rows share.

## How it works
- A `MapLayer` is mostly data: `name` (= folder name), `worlds` it serves, `assetWorld` when the
  `World<n>` folder is not `world + 1`, `tiles` by slot, `cutoutTile`, `spawn`, sky kind
  (`outdoor`, `rain`, `snow`, `snowfall`, `underwater`, `desert`), `clearColor`, `rooms`, and the
  per-object-type tables `blendMeshes`, `effectOnly`, `emissions`.
- The map's own rows for the other controllers: `sound` (beds, one-shots, music, town tracks,
  object loops, monster cues), `lighting` (look, room looks, object lights, thunder), `weather`
  (always rains, wet ground, leaves) and `terrain` (overlays, snow bed, water, rest objects,
  object fixups, grass, a hidden ground). Reworking a controller never touches these; changing what a map sounds
  or looks like is an edit here only. A row that differs between the entry's worlds is written
  `{ byWorld: { [world]: row } }`.
- `create(world)` binds the map's object classes into `world.terrain.MapTileObjects[type]` and adds
  entities the map owns. It runs once per warp. It is always written as
  `world => import('./create').then(m => m.createX(world))`; a static import is an import cycle.
- `reset()` drops what belonged to the map on a map change.
- The `maps` controller (`src/controllers/maps/index.ts`) indexes `MAP_LAYERS` by world and
  answers the renderer, terrain loader, weather and sound.

A map folder:
```
<map>/index.ts    data + the exported <map>Layer
<map>/spec.ts     plain tables: blend meshes, effect-only types, emissions, lights (no scene imports)
<map>/sound.ts    MapSound: beds, music, object loops, monster voices (plain data)
<map>/lighting.ts MapLighting: look over the default, room looks, its spec's light table
<map>/create.ts   object classes bound by type, map-owned entities
<map>/*Object.ts  one file per object type with its own behaviour (Lorencia has 38)
```
Some maps have no `spec.ts` (balgasrefuge, gmarea, karutan2, raklionboss) or no `create.ts`
(doppelganger2, landoftrials).

| Folder | Worlds |
|---|---|
| lorencia, dungeon, devias, noria, losttower | 0, 1, 2, 3, 4 |
| stadium, atlans, tarkan, icarus | 6, 7, 8, 10 |
| devilsquare | 9 and 32 (art in World10) |
| bloodcastle, chaoscastle, kalima | event floors on World12, World19, World25 |
| valleyofloren, landoftrials, aida, crywolf | 30, 31, 33, 34 |
| kanturu1/2/3, gmarea | 37, 38, 39, 40 |
| balgasbarracks, balgasrefuge | 41, 42 |
| cursedtemple | 45 levels 1-6 (World47) |
| elbeland, swamp, raklion, raklionboss | 51, 56, 57, 58 |
| santatown, vulcanus, duelarena | 62, 63, 64 |
| doppelganger1/2/3/4 | 65-68 |
| empireguardian, empireguardian4 | 69-71, 72 |
| loginscene | 73, 74, 77, 78 |
| lorenmarket, karutan1, karutan2 | 79, 80, 81 |

## Depends on / used by
- uses: `@/controllers/maps` (contract, rooms), `@/controllers/terrain`, `@/controllers/render`,
  `@/controllers/fx`, `versions/shared/objects`, `versions/shared/npcs`
- used by: `src/controllers/maps/index.ts` (`MAP_LAYERS`), `src/controllers/maps/_template.ts`

## Change it
- add a map: copy `src/controllers/maps/_template.ts` to `<name>/index.ts`, add `spec.ts` and
  `create.ts` as needed, then add `<name>Layer` to `layers.ts`. Each `ENUM_WORLD` may appear in
  one entry only.
- a tile file is missing in the world folder: name a tile the folder has in that slot, so the
  `EncTerrain<n>.map` indices stay put.
- give an object type behaviour: add `<thing>Object.ts`, bind it by type in `create.ts`.
- change a map's bed, track, object loop or monster voice: its `sound.ts`. Its look, room looks
  or torches: `lighting.ts` (torch rows in `spec.ts`). Rain, wet ground, leaves: `weather` on the
  entry. Overlays, water, seats, grass: `terrain` on the entry.
- data files stay pure: import controller types only (`import type ... from '@/controllers/x'`),
  and plain values from `shared/` or `@versions/shared/objects/enum`, never a controller at run
  time - `layers.ts` loads every entry when the `maps` controller loads.

## Tests
- `mapRows.golden.test.ts`: every per-map row the sound, lighting, weather and terrain
  controllers answer for every world, as hashes; pinned before the rows moved here.
- `tileFiles.test.ts`: every tile slot of every map names a file that exists in its world folder.
- `chaoscastle/thunder.test.ts`: pillar thunder timing and when it strikes.
- `kalima/grassObject.test.ts`: `KalimaWaterPlantObject`.
- `kanturu2/gateway.test.ts`: the gateway turn sound loops from the click, and stays silent when
  the original refuses it.
