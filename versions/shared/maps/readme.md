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
  object fixups, grass, a hidden ground) and `actors` (what spawns bigger: Blood Castle's `actors.ts`). Reworking a controller never touches these; changing what a map sounds
  or looks like is an edit here only. A row that differs between the entry's worlds is written
  `{ byWorld: { [world]: row } }`.
- `create(world)` binds the map's object classes into `world.terrain.MapTileObjects[type]` and adds
  entities the map owns. It runs once per warp. It is always written as
  `world => import('./create').then(m => m.createX(world))`; a static import is an import cycle.
- `reset()` drops what belonged to the map on a map change.
- `all.ts` hands `MAP_LAYERS` to the `maps` controller (`registerMaps`); `src/app/boot.tsx` imports
  it first (tests: `src/version/testSetup.ts`); the controller indexes it by world and answers the renderer,
  terrain loader, weather and sound.

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
  `@/controllers/fx`, `versions/shared/objects`, `versions/shared/monsters` (the Elf Soldier class)
- used by: `all.ts` (registers `MAP_LAYERS` with `src/controllers/maps`), `_template.ts` (the copy-me
  entry, moved here from the controller so it imports no content from there)

## Change it
- add a map: copy `_template.ts` to `<name>/index.ts`, add `spec.ts` and
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
- a flare card takes the sheet the original names (`texture`: `'flare'` for `BITMAP_FLARE`,
  Flare.jpg, already a warm star; `'spark1'` for `BITMAP_SPARK + 1`) and the original's own tint,
  not a warm one; `BITMAP_LIGHT` (flare01.jpg) is the default. A size the original writes without
  `* o->Scale` is `unscaled`; an offset that stands for a bone is `bone: true`, so it grows with the
  object. A row on an animated bone sits at the middle of the bone's motion: a table row cannot
  follow the bone (an object that must, like the Karutan insect, hangs its cards itself).
  `flareSheets.test.ts` lists the table rows that take another sheet.

## Tests
- `mapRows.golden.test.ts`: every per-map row the sound, lighting, weather and terrain
  controllers answer for every world, as hashes; pinned before the rows moved here.
- `tileFiles.test.ts`: every tile slot of every map names a file that exists in its world folder.
- `flareSheets.test.ts`: the table flares the original draws from another sheet than `BITMAP_LIGHT`
  take it with the original's tint, size and motion: `BITMAP_FLARE` (Aida 75 turning on bone 4,
  Loren Market 30 on its three heads and 35 on bone 2), `BITMAP_SPARK + 1` (Aida 30 and 71 on their
  six bulbs, Kanturu 70 whose size breathes, Kanturu 2 8, Karutan 72's plant bulbs breathing on
  `|sin|`), `BITMAP_KANTURU_2ND_EFFECT1` (Kanturu 2 4's pair over its lamp); Karutan 66 and Crywolf 41
  have none (the insect hangs its `BITMAP_SHINY + 5` points itself, the beacon its turning pair).
- `flareWaves.test.ts`: the table cards' waves are the original's `sinf(WorldTime * k)`, k in radians a
  millisecond: the fire vents (Karutan 113, Loren Market 57, Vulcanus 6) burn steady red; Kalima's
  flower glows (12, 32) grow and shrink on bone 5; the Kanturu relic lamps (Kanturu 2 4, Kanturu 3 5)
  breathe and grow with their fLumi; Land of Trials 49 draws two red cards on bone 3; Elbeland's
  lantern (63) breathes and its totem (121) breathes and grows on six bones; and no table wave is
  faster than 0.05.
- `boneRows.test.ts`: the rows the original hangs on a bone are `bone: true` (Noria's lamps, Icarus
  10, Kalima's flowers, Aida's plants and torch, the Kanturu lamps, Elbeland 63, 110 and 121, Loren
  Market 30 and 35, Karutan 72, Land of Trials 49), and Noria's swinging lanterns sit at the middle of
  their swing.
- `fireLights.test.ts`: the ground lights the original throws take its position and range on every
  preset: Devias 66's `CreateFire` 50 up at range 4, Lorencia 150 at range 3, Loren Market 30 and 35
  breathing on their bones, Kanturu 70 on its sine.
- `bloodcastle/lampObject.test.ts`: the throne-room lamp's flare is `BITMAP_FLARE` too.
- `lampFlares.test.ts`, `lorencia/candleObject.test.ts`, `devias/candleObject.test.ts`: what the original
  never draws is the `lampFlares` improvement, gone on Classic: the flares of Lorencia 90 and 150, Devias
  66 and the candelabra, Elbeland 61 and Lost Tower 23 (the light under them kept), the candle wick fire,
  and the ground lights of the Devias candelabra and Lost Tower 18, 19, 20 and 23.
- `loginscene/wallTorchObject.test.ts`, `empireguardian4/spec.test.ts`: the wall torch's flare, on
  the `BITMAP_FLARE` sheet lit or not, and the fortress lights on Classic and Enhanced; a lit torch's
  warm tint gives Flare.jpg the mean colour its old tint gave flare01.jpg, worked out from the two
  sheets' pixels in `Data/Effect`.
- `empireguardian/spec.test.ts`: days 1-3 draw day 4's blue lamp (80) and bind its wall torch (37).
- `chaoscastle/thunder.test.ts`: pillar thunder timing, which pillar it strikes and the bolt's fall.
- `chaoscastle/clouds.test.ts`: the blue fog banks on types 6-11; 12 stays a marker.
- `chaoscastle/lighting.test.ts`: one look row on every arena, no sky, black haze from the hero, no
  underworld.
- `kalima/grassObject.test.ts`: `KalimaWaterPlantObject`.
- `kanturu2/gateway.test.ts`: the gateway turn sound loops from the click, and stays silent when
  the original refuses it.
- `crywolf/beaconObject.test.ts`: the beacon's two `BITMAP_FLARE`s ride `350 + aaa` in step on every
  beacon, and the second turns by the one `Ro` each beacon in view bumps a degree a frame, so n in view
  turn it n times as fast.
- `karutan1/insectObject.test.ts`: the insect's two `BITMAP_SHINY + 5` points ride bones 13 and 14
  and breathe on `|sin|`; it is never a batched prop.
- `tarkan/impactGlowObject.test.ts`: the temple glow is `BITMAP_IMPACT`, its size and colour
  breathing together.
- `losttower/towerMachineObject.test.ts`: the machines draw `BITMAP_MAGIC + 1` (19) and
  `BITMAP_LIGHTNING + 1` (20) pairs that turn against each other.
